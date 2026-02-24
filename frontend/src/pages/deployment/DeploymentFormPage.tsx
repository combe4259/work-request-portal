import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FormField } from '@/components/common/FormField'
import { inputCls, textareaCls, selectCls } from '@/lib/formStyles'
import { useCreateDeploymentMutation } from '@/features/deployment/mutations'

// ── 스키마 ──────────────────────────────────────────
const schema = z.object({
  title: z.string().min(1, '제목을 입력해주세요').max(100),
  version: z.string().min(1, '버전을 입력해주세요').max(20),
  type: z.enum(['정기배포', '긴급패치', '핫픽스', '롤백', '기타'] as const, { error: '유형을 선택해주세요' }),
  env: z.enum(['개발', '스테이징', '운영'] as const, { error: '환경을 선택해주세요' }),
  deployDate: z.string().min(1, '배포 예정일을 선택해주세요'),
  manager: z.string().optional(),
  overview: z.string().max(500).optional(),
  rollback: z.string().max(500).optional(),
})

type FormValues = z.infer<typeof schema>

const MANAGERS = ['최인프라', '김개발', '이설계', '박테스터']

const ALL_DOCS = [
  { docNo: 'WR-051', title: '모바일 PDA 화면 레이아웃 개선 요청' },
  { docNo: 'WR-050', title: '신규 계좌 개설 프로세스 자동화' },
  { docNo: 'WR-046', title: '주문 내역 엑셀 다운로드 기능 추가' },
  { docNo: 'TK-021', title: '계좌 조회 서비스 레이어 리팩토링' },
  { docNo: 'TK-020', title: 'N+1 쿼리 문제 해결 — 잔고 조회 API' },
  { docNo: 'DF-034', title: 'Galaxy S23에서 메인 메뉴 버튼 화면 밖 이탈' },
  { docNo: 'DF-030', title: '로그인 세션 만료 후 이전 페이지 캐시 노출' },
  { docNo: 'DF-029', title: '엑셀 다운로드 시 일부 특수문자 깨짐 현상' },
]

let stepIdCounter = 3

export default function DeploymentFormPage() {
  const navigate = useNavigate()
  const createDeployment = useCreateDeploymentMutation()

  // 포함 항목 (multi)
  const [includedDocs, setIncludedDocs] = useState<{ docNo: string; title: string }[]>([])
  const [docSearch, setDocSearch] = useState('')
  const [docDropOpen, setDocDropOpen] = useState(false)
  const docRef = useRef<HTMLDivElement>(null)

  // 배포 절차
  const [steps, setSteps] = useState<{ id: number; text: string }[]>([
    { id: 1, text: '' },
    { id: 2, text: '' },
    { id: 3, text: '' },
  ])

  // 첨부파일
  const [fileList, setFileList] = useState<File[]>([])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (docRef.current && !docRef.current.contains(e.target as Node)) setDocDropOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filteredDocs = ALL_DOCS.filter(
    (d) =>
      !includedDocs.find((r) => r.docNo === d.docNo) &&
      (d.docNo.toLowerCase().includes(docSearch.toLowerCase()) || d.title.includes(docSearch))
  )

  const addDoc = (doc: { docNo: string; title: string }) => {
    setIncludedDocs((prev) => [...prev, doc])
    setDocSearch('')
    setDocDropOpen(false)
  }

  const removeDoc = (docNo: string) => setIncludedDocs((prev) => prev.filter((d) => d.docNo !== docNo))

  const addStep = () => {
    stepIdCounter++
    setSteps((prev) => [...prev, { id: stepIdCounter, text: '' }])
  }

  const removeStep = (id: number) => {
    if (steps.length <= 1) return
    setSteps((prev) => prev.filter((s) => s.id !== id))
  }

  const updateStep = (id: number, text: string) =>
    setSteps((prev) => prev.map((s) => s.id === id ? { ...s, text } : s))

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFileList((prev) => [...prev, ...Array.from(e.target.files!)])
  }

  const removeFile = (idx: number) => setFileList((prev) => prev.filter((_, i) => i !== idx))

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: '정기배포', env: '개발' },
  })

  const envValue = watch('env')

  const onSubmit = async (data: FormValues) => {
    await createDeployment.mutateAsync({
      title: data.title,
      version: data.version,
      type: data.type,
      env: data.env,
      deployDate: data.deployDate,
      manager: data.manager,
      overview: data.overview,
      rollback: data.rollback,
      includedDocs: includedDocs.map((doc) => doc.docNo),
      steps: steps.map((step) => step.text.trim()).filter((step) => step.length > 0),
    })
    navigate('/deployments')
  }

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
            <h1 className="text-[18px] font-bold text-gray-900">배포 등록</h1>
            <p className="text-[12px] text-gray-400 mt-0.5">새로운 배포 계획을 등록합니다</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_12px_rgba(30,58,138,0.07)] p-6 space-y-5">

            {/* 제목 */}
            <FormField label="제목" required error={errors.title?.message}>
              <input
                {...register('title')}
                placeholder="예) v2.3.0 2월 정기 배포"
                className={inputCls(!!errors.title)}
              />
            </FormField>

            {/* 버전 · 유형 · 환경 */}
            <div className="grid grid-cols-3 gap-4">
              <FormField label="버전" required error={errors.version?.message}>
                <input
                  {...register('version')}
                  placeholder="예) v2.3.0"
                  className={inputCls(!!errors.version)}
                />
              </FormField>

              <FormField label="배포 유형" required error={errors.type?.message}>
                <select {...register('type')} className={selectCls(!!errors.type)}>
                  <option value="정기배포">정기배포</option>
                  <option value="긴급패치">긴급패치</option>
                  <option value="핫픽스">핫픽스</option>
                  <option value="롤백">롤백</option>
                  <option value="기타">기타</option>
                </select>
              </FormField>

              <FormField label="배포 환경" required error={errors.env?.message}>
                <select
                  {...register('env')}
                  className={`${selectCls(!!errors.env)} ${
                    envValue === '운영' ? 'text-red-600 font-semibold' : envValue === '스테이징' ? 'text-amber-600' : ''
                  }`}
                >
                  <option value="개발">개발</option>
                  <option value="스테이징">스테이징</option>
                  <option value="운영">운영</option>
                </select>
              </FormField>
            </div>

            {/* 운영 환경 경고 */}
            {envValue === '운영' && (
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-red-50 border border-red-100 rounded-lg">
                <WarningIcon />
                <p className="text-[12px] text-red-600 font-medium">운영 환경 배포입니다. 배포 절차와 롤백 계획을 반드시 확인해주세요.</p>
              </div>
            )}

            {/* 담당자 · 배포 예정일 */}
            <div className="grid grid-cols-2 gap-4">
              <FormField label="배포 담당자">
                <select {...register('manager')} className={selectCls(false)}>
                  {MANAGERS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </FormField>

              <FormField label="배포 예정일" required error={errors.deployDate?.message}>
                <input
                  type="date"
                  {...register('deployDate')}
                  min={new Date().toISOString().split('T')[0]}
                  className={inputCls(!!errors.deployDate)}
                />
              </FormField>
            </div>

            {/* 구분선 */}
            <div className="border-t border-gray-100" />

            {/* 포함 항목 */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-semibold text-gray-600 block">
                포함 항목
                <span className="ml-1 font-normal text-gray-400">(이번 배포에 포함된 WR / TK / DF)</span>
              </label>
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
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                    {filteredDocs.map((doc) => (
                      <button
                        key={doc.docNo}
                        type="button"
                        onMouseDown={() => addDoc(doc)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-blue-50 transition-colors text-left"
                      >
                        <span className={`font-mono text-[11px] flex-shrink-0 px-1.5 py-0.5 rounded ${
                          doc.docNo.startsWith('WR') ? 'bg-blue-50 text-blue-500' :
                          doc.docNo.startsWith('TK') ? 'bg-slate-100 text-slate-500' :
                          'bg-red-50 text-red-500'
                        }`}>{doc.docNo}</span>
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
              {includedDocs.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {includedDocs.map((doc) => (
                    <span key={doc.docNo} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono ${
                      doc.docNo.startsWith('WR') ? 'bg-blue-50 text-blue-600' :
                      doc.docNo.startsWith('TK') ? 'bg-slate-100 text-slate-600' :
                      'bg-red-50 text-red-500'
                    }`}>
                      {doc.docNo}
                      <button type="button" onClick={() => removeDoc(doc.docNo)} className="opacity-60 hover:opacity-100 ml-0.5">
                        <CloseIcon />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 배포 개요 */}
            <FormField label="배포 개요" error={errors.overview?.message}>
              <textarea
                {...register('overview')}
                placeholder="이번 배포에 포함된 주요 변경 사항을 간략히 작성해주세요 (선택)"
                rows={2}
                className={`${textareaCls(!!errors.overview)} resize-none`}
              />
            </FormField>

            {/* 배포 절차 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[12px] font-semibold text-gray-600">배포 절차</label>
                <span className="text-[11px] text-gray-400">{steps.length}단계</span>
              </div>
              <div className="space-y-2">
                {steps.map((step, idx) => (
                  <div key={step.id} className="flex items-center gap-2 group">
                    <span className="w-5 h-5 rounded-full bg-brand/10 text-brand text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={step.text}
                      onChange={(e) => updateStep(step.id, e.target.value)}
                      placeholder={`${idx + 1}단계 절차를 입력해주세요`}
                      className={`${inputCls(false)} flex-1`}
                    />
                    <button
                      type="button"
                      onClick={() => removeStep(step.id)}
                      disabled={steps.length <= 1}
                      className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-red-400 transition-colors disabled:opacity-0 opacity-0 group-hover:opacity-100"
                    >
                      <CloseIcon />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addStep}
                className="flex items-center gap-1.5 text-[12px] text-brand/70 hover:text-brand font-medium transition-colors mt-1 px-1"
              >
                <PlusIcon />
                단계 추가
              </button>
            </div>

            {/* 롤백 계획 */}
            <FormField label="롤백 계획" error={errors.rollback?.message}>
              <textarea
                {...register('rollback')}
                placeholder={envValue === '운영'
                  ? '운영 배포 시 롤백 계획을 반드시 작성해주세요 (이전 버전 복구 방법, 담당자 등)'
                  : '배포 실패 시 롤백 방법을 작성해주세요 (선택)'}
                rows={2}
                className={`${textareaCls(!!errors.rollback)} resize-none ${envValue === '운영' ? 'border-red-100 focus:border-red-300 focus:ring-red-50' : ''}`}
              />
            </FormField>

            {/* 첨부파일 */}
            <div className="border-t border-gray-100 pt-5 space-y-2">
              <label className="text-[12px] font-semibold text-gray-600 block">
                첨부파일 <span className="font-normal text-gray-400">(배포 계획서, 변경 명세서 등)</span>
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
              disabled={isSubmitting || createDeployment.isPending}
              className="h-9 px-5 text-[13px] font-semibold text-white bg-brand hover:bg-brand-hover rounded-lg transition-colors disabled:opacity-60 flex items-center gap-2"
            >
              {isSubmitting || createDeployment.isPending ? <><SpinnerIcon />등록 중...</> : '등록하기'}
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

function WarningIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M7 1.5L13 12.5H1L7 1.5Z" stroke="#ef4444" strokeWidth="1.3" strokeLinejoin="round" /><line x1="7" y1="5.5" x2="7" y2="8.5" stroke="#ef4444" strokeWidth="1.3" strokeLinecap="round" /><circle cx="7" cy="10.5" r="0.6" fill="#ef4444" /></svg>
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
