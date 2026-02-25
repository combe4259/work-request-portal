import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ErrorState, LoadingState } from '@/components/common/AsyncState'
import { FormField } from '@/components/common/FormField'
import { inputCls, textareaCls, selectCls } from '@/lib/formStyles'
import { useTeamMembersQuery } from '@/features/auth/queries'
import { useDocumentIndexQuery } from '@/features/document-index/queries'
import { useCreateTechTaskMutation, useUpdateTechTaskMutation } from '@/features/tech-task/mutations'
import { useTechTaskDetailQuery, useTechTaskPrLinksQuery, useTechTaskRelatedRefsQuery } from '@/features/tech-task/queries'
import { techTaskFormSchema, type TechTaskFormValues } from '@/features/tech-task/schemas'
import { createTechTaskPrLink, deleteTechTaskPrLink } from '@/features/tech-task/service'
import { createAttachmentsFromFiles } from '@/features/attachment/service'
import { useAuthStore } from '@/stores/authStore'

const ALLOWED_REF_TYPES = [
  'WORK_REQUEST',
  'TECH_TASK',
  'TEST_SCENARIO',
  'DEFECT',
  'DEPLOYMENT',
] as const

function parseDefinitionOfDone(raw: string | undefined): string[] {
  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed
      .map((item) => {
        if (typeof item === 'string') {
          return item.trim()
        }
        if (typeof item === 'object' && item !== null && 'text' in item) {
          return String((item as { text: unknown }).text ?? '').trim()
        }
        return ''
      })
      .filter((item) => item.length > 0)
  } catch {
    return []
  }
}

export default function TechTaskFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = id != null
  const numericId = Number(id)
  const validEditId = isEdit && Number.isInteger(numericId) && numericId > 0 ? numericId : undefined
  const createTechTask = useCreateTechTaskMutation()
  const updateTechTask = useUpdateTechTaskMutation()
  const currentUser = useAuthStore((state) => state.user)
  const currentTeam = useAuthStore((state) => state.currentTeam)
  const teamMembersQuery = useTeamMembersQuery(currentTeam?.id)
  const detailQuery = useTechTaskDetailQuery(validEditId)
  const relatedRefsQuery = useTechTaskRelatedRefsQuery(validEditId)
  const prLinksQuery = useTechTaskPrLinksQuery(validEditId)

  // 완료 기준
  const [dodItems, setDodItems] = useState<string[]>([])
  const [dodInput, setDodInput] = useState('')

  // 연관 문서
  const [relatedDocs, setRelatedDocs] = useState<{ docNo: string; title: string }[]>([])
  const [docSearch, setDocSearch] = useState('')
  const [docDropOpen, setDocDropOpen] = useState(false)
  const docRef = useRef<HTMLDivElement>(null)
  const documentIndexQuery = useDocumentIndexQuery({
    q: docSearch,
    types: [...ALLOWED_REF_TYPES],
    teamId: currentTeam?.id,
    enabled: docDropOpen && Boolean(currentTeam?.id),
    size: 40,
  })

  // 첨부파일
  const [fileList, setFileList] = useState<File[]>([])
  const [prLinks, setPrLinks] = useState<Array<{ id: number; branchName: string; prNo: string; prUrl: string }>>([])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (docRef.current && !docRef.current.contains(e.target as Node)) {
        setDocDropOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filteredDocs = (documentIndexQuery.data ?? []).filter(
    (d) =>
      !relatedDocs.find((r) => r.docNo === d.docNo) &&
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

  const addDoc = (doc: { docNo: string; title: string }) => {
    setRelatedDocs((prev) => [...prev, doc])
    setDocSearch('')
    setDocDropOpen(false)
  }

  const removeDoc = (docNo: string) => setRelatedDocs((prev) => prev.filter((d) => d.docNo !== docNo))

  const addDodItem = () => {
    const trimmed = dodInput.trim()
    if (!trimmed) return
    setDodItems((prev) => [...prev, trimmed])
    setDodInput('')
  }

  const removeDodItem = (idx: number) => setDodItems((prev) => prev.filter((_, i) => i !== idx))

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFileList((prev) => [...prev, ...Array.from(e.target.files!)])
  }

  const removeFile = (idx: number) => setFileList((prev) => prev.filter((_, i) => i !== idx))
  const addPrLink = () => {
    setPrLinks((prev) => [
      ...prev,
      { id: Date.now(), branchName: '', prNo: '', prUrl: '' },
    ])
  }
  const removePrLink = (id: number) => {
    setPrLinks((prev) => prev.filter((item) => item.id !== id))
  }
  const updatePrLink = (id: number, field: 'branchName' | 'prNo' | 'prUrl', value: string) => {
    setPrLinks((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TechTaskFormValues>({
    resolver: zodResolver(techTaskFormSchema),
    defaultValues: { priority: '보통', type: '리팩토링' },
  })

  const issueValue = useWatch({ control, name: 'currentIssue' }) ?? ''
  const solutionValue = useWatch({ control, name: 'solution' }) ?? ''

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
      currentIssue: detailQuery.data.currentIssue,
      solution: detailQuery.data.solution,
    })

    const parsedDod = parseDefinitionOfDone(detailQuery.data.definitionOfDone)
    setDodItems(parsedDod)
  }, [detailQuery.data, reset])

  useEffect(() => {
    if (!relatedRefsQuery.data) {
      return
    }
    setRelatedDocs(relatedRefsQuery.data.map((item) => ({ docNo: item.refNo, title: item.title ?? item.refNo })))
  }, [relatedRefsQuery.data])

  useEffect(() => {
    if (!prLinksQuery.data) {
      return
    }
    setPrLinks(prLinksQuery.data.map((item) => ({
      id: item.id,
      branchName: item.branchName,
      prNo: item.prNo ?? '',
      prUrl: item.prUrl ?? '',
    })))
  }, [prLinksQuery.data])

  const onSubmit = async (data: TechTaskFormValues) => {
    const persistPrLinks = async (taskId: string | number, removeExisting: boolean) => {
      const items = prLinks
        .map((item) => ({
          branchName: item.branchName.trim(),
          prNo: item.prNo.trim(),
          prUrl: item.prUrl.trim(),
        }))
        .filter((item) => item.branchName.length > 0)

      if (removeExisting && prLinksQuery.data) {
        await Promise.all(prLinksQuery.data.map((item) => deleteTechTaskPrLink(taskId, item.id)))
      }

      if (items.length > 0) {
        await Promise.all(items.map((item) => createTechTaskPrLink(taskId, {
          branchName: item.branchName,
          prNo: item.prNo || null,
          prUrl: item.prUrl || null,
        })))
      }
    }

    if (validEditId != null && detailQuery.data) {
      await updateTechTask.mutateAsync({
        id: validEditId,
        title: data.title,
        type: data.type,
        priority: data.priority,
        status: detailQuery.data.status,
        deadline: data.deadline,
        currentIssue: data.currentIssue,
        solution: data.solution,
        definitionOfDone: dodItems.length > 0 ? JSON.stringify(dodItems) : undefined,
        assignee: data.assignee,
        relatedDocs: relatedDocs.map((doc) => doc.docNo),
      })
      if (fileList.length > 0) {
        await createAttachmentsFromFiles({
          refType: 'TECH_TASK',
          refId: validEditId,
          files: fileList,
        })
      }
      await persistPrLinks(validEditId, true)
      navigate(`/tech-tasks/${validEditId}`)
      return
    }

    const created = await createTechTask.mutateAsync({
      title: data.title,
      type: data.type,
      priority: data.priority,
      deadline: data.deadline,
      currentIssue: data.currentIssue,
      solution: data.solution,
      definitionOfDone: dodItems.length > 0 ? JSON.stringify(dodItems) : undefined,
      assignee: data.assignee,
      relatedDocs: relatedDocs.map((doc) => doc.docNo),
    })
    if (fileList.length > 0) {
      await createAttachmentsFromFiles({
        refType: 'TECH_TASK',
        refId: created.id,
        files: fileList,
      })
    }
    await persistPrLinks(created.id, false)
    navigate(`/tech-tasks/${created.id}`)
  }

  if (isEdit && validEditId == null) {
    return (
      <div className="p-6">
        <ErrorState
          title="잘못된 접근입니다"
          description="기술과제 ID가 올바르지 않습니다."
          actionLabel="목록으로 이동"
          onAction={() => navigate('/tech-tasks')}
        />
      </div>
    )
  }

  if (isEdit && (detailQuery.isPending || prLinksQuery.isPending)) {
    return (
      <div className="p-6">
        <LoadingState title="기술과제 정보를 불러오는 중입니다" description="잠시만 기다려주세요." />
      </div>
    )
  }

  if (isEdit && (detailQuery.isError || !detailQuery.data)) {
    return (
      <div className="p-6">
        <ErrorState
          title="기술과제 정보를 불러오지 못했습니다"
          description="잠시 후 다시 시도해주세요."
          actionLabel="다시 시도"
          onAction={() => {
            void detailQuery.refetch()
          }}
        />
      </div>
    )
  }

  const isMutating = isSubmitting || createTechTask.isPending || updateTechTask.isPending

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
            <h1 className="text-[18px] font-bold text-gray-900">{isEdit ? '기술과제 수정' : '기술과제 등록'}</h1>
            <p className="text-[12px] text-gray-400 mt-0.5">{isEdit ? '기술과제 내용을 수정합니다' : '새로운 기술과제를 등록합니다'}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_12px_rgba(30,58,138,0.07)] p-6 space-y-5">

            {/* 제목 */}
            <FormField label="제목" required error={errors.title?.message}>
              <input
                {...register('title')}
                placeholder="기술과제 제목을 입력해주세요"
                className={inputCls(!!errors.title)}
              />
            </FormField>

            {/* 유형 · 우선순위 · 마감일 */}
            <div className="grid grid-cols-3 gap-4">
              <FormField label="유형" required error={errors.type?.message}>
                <select {...register('type')} className={selectCls(!!errors.type)}>
                  <option value="리팩토링">리팩토링</option>
                  <option value="기술부채">기술부채</option>
                  <option value="성능개선">성능개선</option>
                  <option value="보안">보안</option>
                  <option value="테스트">테스트</option>
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
                  <input
                    type="text"
                    value={docSearch}
                    onFocus={() => setDocDropOpen(true)}
                    onChange={(e) => { setDocSearch(e.target.value); setDocDropOpen(true) }}
                    placeholder="문서번호 또는 제목 검색"
                    className={inputCls(false)}
                  />
                  {docDropOpen && filteredDocs.length > 0 && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                      {filteredDocs.map((doc) => (
                        <button
                          key={doc.docNo}
                          type="button"
                          onMouseDown={() => addDoc(doc)}
                          className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-blue-50 transition-colors text-left"
                        >
                          <span className="font-mono text-[11px] text-gray-400 flex-shrink-0">{doc.docNo}</span>
                          <span className="text-[12px] text-gray-700 truncate">{doc.title}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {docDropOpen && filteredDocs.length === 0 && docSearch && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2.5 text-[12px] text-gray-400">
                      검색 결과가 없습니다
                    </div>
                  )}
                </div>
                {relatedDocs.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {relatedDocs.map((doc) => (
                      <span key={doc.docNo} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-[11px] font-mono">
                        {doc.docNo}
                        <button type="button" onClick={() => removeDoc(doc.docNo)} className="text-blue-400 hover:text-blue-600">
                          <CloseIcon />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </FormField>
            </div>

            {/* 구분선 */}
            <div className="border-t border-gray-100" />

            {/* 문제 현황 */}
            <FormField label="문제 현황" required error={errors.currentIssue?.message}>
              <div className="relative">
                <textarea
                  {...register('currentIssue')}
                  placeholder="현재 어떤 문제가 있는지 구체적으로 작성해주세요&#10;&#10;예) 어떤 코드/구조가 문제인지, 어떤 부작용이 발생하는지 등"
                  rows={3}
                  className={`${textareaCls(!!errors.currentIssue)} resize-none`}
                />
                <span className="absolute bottom-2.5 right-3 text-[11px] text-gray-300">{issueValue.length} / 2000</span>
              </div>
            </FormField>

            {/* 개선 방안 */}
            <FormField label="개선 방안" required error={errors.solution?.message}>
              <div className="relative">
                <textarea
                  {...register('solution')}
                  placeholder="어떻게 해결할 것인지 접근 방법을 작성해주세요&#10;&#10;예) 적용할 패턴, 변경할 구조, 사용할 기술 등"
                  rows={3}
                  className={`${textareaCls(!!errors.solution)} resize-none`}
                />
                <span className="absolute bottom-2.5 right-3 text-[11px] text-gray-300">{solutionValue.length} / 2000</span>
              </div>
            </FormField>

            {/* 완료 기준 */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-semibold text-gray-600 block">
                완료 기준
                <span className="ml-1 font-normal text-gray-400">(선택)</span>
              </label>
              {/* 입력 */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={dodInput}
                  onChange={(e) => setDodInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDodItem() } }}
                  placeholder="완료 조건 항목 입력 후 Enter"
                  className={`${inputCls(false)} flex-1`}
                />
                <button
                  type="button"
                  onClick={addDodItem}
                  disabled={!dodInput.trim()}
                  className="h-9 px-3 border border-gray-200 rounded-lg text-[12px] text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-40 flex items-center gap-1"
                >
                  <PlusIcon />
                  추가
                </button>
              </div>
              {/* 항목 목록 */}
              {dodItems.length > 0 && (
                <div className="space-y-1.5 mt-2">
                  {dodItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2.5 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100 group">
                      <div className="w-3.5 h-3.5 rounded border-2 border-gray-300 flex-shrink-0" />
                      <span className="text-[12px] text-gray-700 flex-1">{item}</span>
                      <button
                        type="button"
                        onClick={() => removeDodItem(idx)}
                        className="text-gray-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <CloseIcon />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* PR / 브랜치 */}
            <div className="space-y-2">
              <label className="text-[12px] font-semibold text-gray-600 block">
                PR / 브랜치
                <span className="ml-1 font-normal text-gray-400">(선택)</span>
              </label>

              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] text-gray-400">브랜치명 기준으로 저장됩니다. PR 번호/URL은 선택 입력입니다.</p>
                <button
                  type="button"
                  onClick={addPrLink}
                  className="h-8 px-3 border border-gray-200 rounded-lg text-[12px] text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition-colors flex items-center gap-1"
                >
                  <PlusIcon />
                  추가
                </button>
              </div>

              {prLinks.length === 0 ? (
                <div className="px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-lg text-[12px] text-gray-400">
                  등록된 PR/브랜치 항목이 없습니다.
                </div>
              ) : (
                <div className="space-y-2">
                  {prLinks.map((item) => (
                    <div key={item.id} className="px-3 py-3 bg-gray-50 border border-gray-100 rounded-lg space-y-2">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={item.branchName}
                          onChange={(event) => updatePrLink(item.id, 'branchName', event.target.value)}
                          placeholder="브랜치명 (예: feature/login)"
                          className={inputCls(false)}
                        />
                        <input
                          type="text"
                          value={item.prNo}
                          onChange={(event) => updatePrLink(item.id, 'prNo', event.target.value)}
                          placeholder="PR 번호 (선택)"
                          className={inputCls(false)}
                        />
                        <input
                          type="url"
                          value={item.prUrl}
                          onChange={(event) => updatePrLink(item.id, 'prUrl', event.target.value)}
                          placeholder="PR URL (선택)"
                          className={inputCls(false)}
                        />
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => removePrLink(item.id)}
                          className="text-[12px] text-gray-400 hover:text-red-500 transition-colors"
                        >
                          항목 제거
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 첨부파일 */}
            <div className="space-y-2">
              <label className="text-[12px] font-semibold text-gray-600 block">
                첨부파일
                <span className="ml-1 font-normal text-gray-400">(선택)</span>
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
