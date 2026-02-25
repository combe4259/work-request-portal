import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ErrorState, LoadingState } from '@/components/common/AsyncState'
import { FormField } from '@/components/common/FormField'
import { inputCls, textareaCls, selectCls } from '@/lib/formStyles'
import { useTeamMembersQuery } from '@/features/auth/queries'
import { useDocumentIndexQuery } from '@/features/document-index/queries'
import { useCreateTestScenarioMutation, useUpdateTestScenarioMutation } from '@/features/test-scenario/mutations'
import { useTestScenarioDetailQuery, useTestScenarioRelatedRefsQuery } from '@/features/test-scenario/queries'
import { testScenarioFormSchema, type TestScenarioFormValues } from '@/features/test-scenario/schemas'
import { createAttachmentsFromFiles } from '@/features/attachment/service'
import { useAuthStore } from '@/stores/authStore'

interface TestStep {
  id: number
  action: string
  expected: string
}


const ALLOWED_REF_TYPES = [
  'WORK_REQUEST',
  'TECH_TASK',
  'TEST_SCENARIO',
  'DEFECT',
  'DEPLOYMENT',
] as const

let stepIdCounter = 3

function parseScenarioSteps(raw: string): TestStep[] {
  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) {
      return []
    }

    const steps = parsed
      .map((item, index) => {
        if (typeof item === 'string') {
          return {
            id: index + 1,
            action: item,
            expected: '',
          }
        }

        if (typeof item === 'object' && item !== null) {
          const action = String((item as { action?: unknown }).action ?? '').trim()
          const expected = String((item as { expected?: unknown }).expected ?? '').trim()
          return {
            id: index + 1,
            action,
            expected,
          }
        }

        return null
      })
      .filter((step): step is TestStep => step !== null)

    stepIdCounter = Math.max(stepIdCounter, steps.length)
    return steps
  } catch {
    return []
  }
}

export default function TestScenarioFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = id != null
  const numericId = Number(id)
  const validEditId = isEdit && Number.isInteger(numericId) && numericId > 0 ? numericId : undefined
  const createTestScenario = useCreateTestScenarioMutation()
  const updateTestScenario = useUpdateTestScenarioMutation()
  const currentUser = useAuthStore((state) => state.user)
  const currentTeam = useAuthStore((state) => state.currentTeam)
  const teamMembersQuery = useTeamMembersQuery(currentTeam?.id)
  const detailQuery = useTestScenarioDetailQuery(validEditId)
  const relatedRefsQuery = useTestScenarioRelatedRefsQuery(validEditId)

  // 테스트 단계
  const [steps, setSteps] = useState<TestStep[]>([
    { id: 1, action: '', expected: '' },
    { id: 2, action: '', expected: '' },
  ])

  // 연관 문서
  const [relatedDoc, setRelatedDoc] = useState<{ docNo: string; title: string } | null>(null)
  const [docSearch, setDocSearch] = useState('')
  const [docDropOpen, setDocDropOpen] = useState(false)
  const docRef = useRef<HTMLDivElement>(null)
  const documentIndexQuery = useDocumentIndexQuery({
    q: docSearch,
    types: [...ALLOWED_REF_TYPES],
    teamId: currentTeam?.id,
    enabled: docDropOpen && !relatedDoc && Boolean(currentTeam?.id),
    size: 40,
  })

  // 첨부파일
  const [fileList, setFileList] = useState<File[]>([])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (docRef.current && !docRef.current.contains(e.target as Node)) setDocDropOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filteredDocs = (documentIndexQuery.data ?? []).filter(
    (d) =>
      d.docNo !== relatedDoc?.docNo &&
      (d.docNo.toLowerCase().includes(docSearch.toLowerCase()) || d.title.includes(docSearch))
  )

  const assigneeOptions = useMemo(() => {
    const names = new Set<string>()
    if (currentUser?.name) {
      names.add(currentUser.name)
    }
    ;(teamMembersQuery.data ?? []).forEach((member) => {
      names.add(member.name)
    })
    return Array.from(names)
  }, [currentUser?.name, teamMembersQuery.data])

  const selectDoc = (doc: { docNo: string; title: string }) => {
    setRelatedDoc(doc)
    setDocSearch('')
    setDocDropOpen(false)
  }

  const addStep = () => {
    stepIdCounter++
    setSteps((prev) => [...prev, { id: stepIdCounter, action: '', expected: '' }])
  }

  const removeStep = (id: number) => {
    if (steps.length <= 1) return
    setSteps((prev) => prev.filter((s) => s.id !== id))
  }

  const updateStep = (id: number, field: 'action' | 'expected', value: string) => {
    setSteps((prev) => prev.map((s) => s.id === id ? { ...s, [field]: value } : s))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFileList((prev) => [...prev, ...Array.from(e.target.files!)])
  }

  const removeFile = (idx: number) => setFileList((prev) => prev.filter((_, i) => i !== idx))

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TestScenarioFormValues>({
    resolver: zodResolver(testScenarioFormSchema),
    defaultValues: { priority: '보통', type: '기능' },
  })

  useEffect(() => {
    if (!detailQuery.data) {
      return
    }

    reset({
      title: detailQuery.data.title,
      type: detailQuery.data.type,
      priority: detailQuery.data.priority,
      deadline: detailQuery.data.deadline,
      assignee: detailQuery.data.assignee === '미배정' ? '' : detailQuery.data.assignee,
      precondition: detailQuery.data.precondition,
    })

    const parsedSteps = parseScenarioSteps(detailQuery.data.steps)
    setSteps(parsedSteps.length > 0 ? parsedSteps : [{ id: 1, action: '', expected: '' }])
  }, [detailQuery.data, reset])

  useEffect(() => {
    if (!relatedRefsQuery.data || relatedRefsQuery.data.length === 0) {
      return
    }
    const firstRef = relatedRefsQuery.data[0]
    setRelatedDoc({
      docNo: firstRef.refNo,
      title: firstRef.title ?? firstRef.refNo,
    })
  }, [relatedRefsQuery.data])

  const onSubmit = async (data: TestScenarioFormValues) => {
    const serializedSteps = JSON.stringify(
      steps
        .filter((step) => step.action.trim().length > 0 || step.expected.trim().length > 0)
        .map((step) => ({ action: step.action.trim(), expected: step.expected.trim() }))
    )

    if (validEditId != null && detailQuery.data) {
      await updateTestScenario.mutateAsync({
        id: validEditId,
        title: data.title,
        type: data.type,
        priority: data.priority,
        status: detailQuery.data.status,
        assignee: data.assignee,
        precondition: data.precondition,
        steps: serializedSteps,
        expectedResult: detailQuery.data.expectedResult,
        actualResult: detailQuery.data.actualResult,
        statusNote: detailQuery.data.statusNote,
        deadline: data.deadline,
        relatedDoc: relatedDoc?.docNo,
      })
      if (fileList.length > 0) {
        await createAttachmentsFromFiles({
          refType: 'TEST_SCENARIO',
          refId: validEditId,
          files: fileList,
        })
      }
      navigate(`/test-scenarios/${validEditId}`)
      return
    }

    const created = await createTestScenario.mutateAsync({
      title: data.title,
      type: data.type,
      priority: data.priority,
      deadline: data.deadline,
      assignee: data.assignee,
      precondition: data.precondition,
      steps: serializedSteps,
      expectedResult: '',
      actualResult: '',
      relatedDoc: relatedDoc?.docNo,
    })
    if (fileList.length > 0) {
      await createAttachmentsFromFiles({
        refType: 'TEST_SCENARIO',
        refId: created.id,
        files: fileList,
      })
    }
    navigate(`/test-scenarios/${created.id}`)
  }

  if (isEdit && validEditId == null) {
    return (
      <div className="p-6">
        <ErrorState
          title="잘못된 접근입니다"
          description="테스트 시나리오 ID가 올바르지 않습니다."
          actionLabel="목록으로 이동"
          onAction={() => navigate('/test-scenarios')}
        />
      </div>
    )
  }

  if (isEdit && detailQuery.isPending) {
    return (
      <div className="p-6">
        <LoadingState title="테스트 시나리오 정보를 불러오는 중입니다" description="잠시만 기다려주세요." />
      </div>
    )
  }

  if (isEdit && (detailQuery.isError || !detailQuery.data)) {
    return (
      <div className="p-6">
        <ErrorState
          title="테스트 시나리오 정보를 불러오지 못했습니다"
          description="잠시 후 다시 시도해주세요."
          actionLabel="다시 시도"
          onAction={() => {
            void detailQuery.refetch()
          }}
        />
      </div>
    )
  }

  const isMutating = isSubmitting || createTestScenario.isPending || updateTestScenario.isPending

  return (
    <div className="min-h-full p-6 flex flex-col items-center">
      <div className="w-full max-w-[720px]">

        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-white hover:text-gray-600 transition-colors border border-gray-200"
          >
            <BackIcon />
          </button>
          <div>
            <h1 className="text-[18px] font-bold text-gray-900">{isEdit ? '테스트 시나리오 수정' : '테스트 시나리오 등록'}</h1>
            <p className="text-[12px] text-gray-400 mt-0.5">{isEdit ? '테스트 시나리오 내용을 수정합니다' : '새로운 테스트 시나리오를 등록합니다'}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_12px_rgba(30,58,138,0.07)] p-6 space-y-5">

            {/* 제목 */}
            <FormField label="제목" required error={errors.title?.message}>
              <input
                {...register('title')}
                placeholder="테스트 시나리오 제목을 입력해주세요"
                className={inputCls(!!errors.title)}
              />
            </FormField>

            {/* 유형 · 우선순위 · 마감일 */}
            <div className="grid grid-cols-3 gap-4">
              <FormField label="유형" required error={errors.type?.message}>
                <select {...register('type')} className={selectCls(!!errors.type)}>
                  <option value="기능">기능</option>
                  <option value="회귀">회귀</option>
                  <option value="통합">통합</option>
                  <option value="E2E">E2E</option>
                  <option value="성능">성능</option>
                  <option value="보안">보안</option>
                  <option value="기타">기타</option>
                </select>
              </FormField>

              <FormField label="우선순위" required error={errors.priority?.message}>
                <select {...register('priority')} className={selectCls(!!errors.priority)}>
                  <option value="긴급">긴급</option>
                  <option value="높음">높음</option>
                  <option value="보통">보통</option>
                  <option value="낮음">낮음</option>
                </select>
              </FormField>

              <FormField label="마감일" required error={errors.deadline?.message}>
                <input
                  type="date"
                  {...register('deadline')}
                  min={new Date().toISOString().split('T')[0]}
                  className={inputCls(!!errors.deadline)}
                />
              </FormField>
            </div>

            {/* 담당자 · 연관 문서번호 */}
            <div className="grid grid-cols-2 gap-4">
              <FormField label="담당자">
                <select {...register('assignee')} className={selectCls(false)}>
                  <option value="">미배정</option>
                  {assigneeOptions.map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
              </FormField>

              <FormField label="연관 문서번호">
                <div ref={docRef} className="relative">
                  {relatedDoc ? (
                    <div className="flex items-center gap-2 h-9 px-3 border border-gray-200 rounded-lg bg-gray-50">
                      <span className="font-mono text-[11px] text-gray-400">{relatedDoc.docNo}</span>
                      <span className="text-[12px] text-gray-700 flex-1 truncate">{relatedDoc.title}</span>
                      <button type="button" onClick={() => setRelatedDoc(null)} className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0">
                        <CloseIcon />
                      </button>
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={docSearch}
                      onFocus={() => setDocDropOpen(true)}
                      onChange={(e) => { setDocSearch(e.target.value); setDocDropOpen(true) }}
                      placeholder="문서번호 또는 제목 검색"
                      className={inputCls(false)}
                    />
                  )}
                  {!relatedDoc && docDropOpen && filteredDocs.length > 0 && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                      {filteredDocs.map((doc) => (
                        <button
                          key={doc.docNo}
                          type="button"
                          onMouseDown={() => selectDoc(doc)}
                          className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-blue-50 transition-colors text-left"
                        >
                          <span className="font-mono text-[11px] text-gray-400 flex-shrink-0">{doc.docNo}</span>
                          <span className="text-[12px] text-gray-700 truncate">{doc.title}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {!relatedDoc && docDropOpen && filteredDocs.length === 0 && docSearch && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2.5 text-[12px] text-gray-400">
                      검색 결과가 없습니다
                    </div>
                  )}
                </div>
              </FormField>
            </div>

            {/* 구분선 */}
            <div className="border-t border-gray-100" />

            {/* 사전 조건 */}
            <FormField label="사전 조건" error={errors.precondition?.message}>
              <textarea
                {...register('precondition')}
                placeholder="테스트 실행 전 필요한 환경, 데이터, 권한 등을 작성해주세요 (선택)"
                rows={2}
                className={`${textareaCls(!!errors.precondition)} resize-none`}
              />
            </FormField>

            {/* 테스트 단계 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[12px] font-semibold text-gray-600">
                  테스트 단계 <span className="text-red-400">*</span>
                </label>
                <span className="text-[11px] text-gray-400">{steps.length}단계</span>
              </div>

              {/* 단계 헤더 */}
              <div className="grid grid-cols-[28px_1fr_1fr_28px] gap-2 px-1">
                <div />
                <p className="text-[11px] font-semibold text-gray-400">테스트 액션</p>
                <p className="text-[11px] font-semibold text-gray-400">기대 결과</p>
                <div />
              </div>

              <div className="space-y-2">
                {steps.map((step, idx) => (
                  <div key={step.id} className="grid grid-cols-[28px_1fr_1fr_28px] gap-2 items-start group">
                    {/* 단계 번호 */}
                    <div className="w-7 h-9 flex items-center justify-center">
                      <span className="w-5 h-5 rounded-full bg-brand/10 text-brand text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                        {idx + 1}
                      </span>
                    </div>

                    {/* 액션 */}
                    <input
                      type="text"
                      value={step.action}
                      onChange={(e) => updateStep(step.id, 'action', e.target.value)}
                      placeholder="무엇을 하는지 입력"
                      className={inputCls(false)}
                    />

                    {/* 기대 결과 */}
                    <input
                      type="text"
                      value={step.expected}
                      onChange={(e) => updateStep(step.id, 'expected', e.target.value)}
                      placeholder="어떻게 되어야 하는지 입력"
                      className={inputCls(false)}
                    />

                    {/* 삭제 */}
                    <div className="w-7 h-9 flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => removeStep(step.id)}
                        disabled={steps.length <= 1}
                        className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-red-400 transition-colors disabled:opacity-0 opacity-0 group-hover:opacity-100"
                      >
                        <CloseIcon />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* 단계 추가 버튼 */}
              <button
                type="button"
                onClick={addStep}
                className="flex items-center gap-1.5 text-[12px] text-brand/70 hover:text-brand font-medium transition-colors mt-1 px-1"
              >
                <PlusIcon />
                단계 추가
              </button>
            </div>

            {/* 첨부파일 */}
            <div className="border-t border-gray-100 pt-5 space-y-2">
              <label className="text-[12px] font-semibold text-gray-600 block">
                첨부파일 <span className="font-normal text-gray-400">(선택)</span>
              </label>
              <label className="flex items-center gap-2 w-fit cursor-pointer">
                <div className="flex items-center gap-1.5 h-8 px-3 border border-gray-200 rounded-lg text-[12px] text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition-colors">
                  <AttachIcon />
                  파일 첨부
                </div>
                <input type="file" multiple className="hidden" onChange={handleFileChange} />
              </label>
              {fileList.length > 0 && (
                <div className="space-y-1.5 mt-2">
                  {fileList.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
                      <FileIcon />
                      <span className="text-[12px] text-gray-700 flex-1 truncate">{file.name}</span>
                      <span className="text-[11px] text-gray-400">{formatFileSize(file.size)}</span>
                      <button type="button" onClick={() => removeFile(idx)} className="text-gray-300 hover:text-red-400 transition-colors ml-1">
                        <CloseIcon />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex items-center justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="h-9 px-4 text-[13px] font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-white transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isMutating}
              className="h-9 px-5 text-[13px] font-semibold text-white bg-brand hover:bg-brand-hover rounded-lg transition-colors disabled:opacity-60 flex items-center gap-2"
            >
              {isMutating ? <><SpinnerIcon />{isEdit ? '수정 중...' : '등록 중...'}</> : isEdit ? '수정 완료' : '등록하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

// ── SVG 아이콘 ────────────────────────────────────────
function BackIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M9 2.5L5 7L9 11.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

function PlusIcon() {
  return <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true"><line x1="5.5" y1="1.5" x2="5.5" y2="9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /><line x1="1.5" y1="5.5" x2="9.5" y2="5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
}

function CloseIcon() {
  return <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
}

function AttachIcon() {
  return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"><path d="M11 6.5L6.5 11C5.12 12.38 2.88 12.38 1.5 11C0.12 9.62 0.12 7.38 1.5 6L6 1.5C6.94 0.56 8.44 0.56 9.38 1.5C10.32 2.44 10.32 3.94 9.38 4.88L4.88 9.38C4.41 9.85 3.65 9.85 3.18 9.38C2.71 8.91 2.71 8.15 3.18 7.68L7.5 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
}

function FileIcon() {
  return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"><path d="M3 1H8L11 4V12H3V1Z" stroke="#9CA3AF" strokeWidth="1.2" strokeLinejoin="round" /><path d="M8 1V4H11" stroke="#9CA3AF" strokeWidth="1.2" strokeLinejoin="round" /></svg>
}

function SpinnerIcon() {
  return <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>
}
