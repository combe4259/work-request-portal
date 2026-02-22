import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { ResourceCategory } from '@/types/resource'

// ── 스키마 ───────────────────────────────────────────
const schema = z.object({
  title: z.string().min(1, '제목을 입력해주세요').max(100, '제목은 100자 이하여야 합니다'),
  url: z.string().min(1, 'URL을 입력해주세요').url('올바른 URL 형식이 아닙니다'),
  category: z.enum(['Figma', 'GitHub', 'Confluence', 'Notion', '문서', '기타'] as const, { error: '카테고리를 선택해주세요' }),
  description: z.string().min(1, '설명을 입력해주세요').max(300, '설명은 300자 이하여야 합니다'),
})

type FormValues = z.infer<typeof schema>

// ── Mock 기존 데이터 (편집 시 로드) ──────────────────
const MOCK_EXISTING: Record<string, FormValues> = {
  '1': { title: 'PDA 업무요청 포털 UI 디자인', url: 'https://www.figma.com/design/example-pda-portal', category: 'Figma', description: '전체 화면 레이아웃, 컴포넌트 라이브러리, 색상 가이드 포함.' },
  '2': { title: '프론트엔드 소스 코드 저장소', url: 'https://github.com/example/work-request-portal', category: 'GitHub', description: 'React + TypeScript + Vite 기반 포털 프론트엔드.' },
  '3': { title: '업무 프로세스 가이드', url: 'https://confluence.example.com/pages/work-process', category: 'Confluence', description: '업무요청 접수부터 완료까지 표준 프로세스 정의.' },
  '4': { title: '기획 및 요구사항 문서', url: 'https://www.notion.so/example/requirements', category: 'Notion', description: '시스템 요구사항 정의서(SRS), 화면 기획서, 사용자 스토리 정리.' },
  '5': { title: 'API 명세서 v2.1', url: 'https://confluence.example.com/pages/api-spec', category: 'Confluence', description: 'REST API 엔드포인트 목록, 요청/응답 스키마, 인증 방식 안내.' },
  '6': { title: '테스트 계획서 2026 Q1', url: 'https://docs.example.com/test-plan-q1', category: '문서', description: '1분기 릴리즈 대상 기능 목록, 테스트 범위, 일정, 환경 구성 포함.' },
  '7': { title: '인프라 아키텍처 다이어그램', url: 'https://www.figma.com/design/example-infra', category: 'Figma', description: 'AWS 기반 서비스 구성도, 네트워크 토폴로지 다이어그램.' },
  '8': { title: '코딩 컨벤션 가이드', url: 'https://www.notion.so/example/coding-convention', category: 'Notion', description: 'TypeScript 스타일 가이드, 폴더 구조 규칙, 컴포넌트 네이밍.' },
}

const CATEGORY_STYLES: Record<ResourceCategory, { active: string; inactive: string }> = {
  Figma:      { active: 'bg-pink-500 text-white border-pink-500',     inactive: 'bg-pink-50 text-pink-600 border-pink-100 hover:border-pink-300' },
  GitHub:     { active: 'bg-gray-700 text-white border-gray-700',     inactive: 'bg-gray-100 text-gray-600 border-gray-200 hover:border-gray-400' },
  Confluence: { active: 'bg-blue-500 text-white border-blue-500',     inactive: 'bg-blue-50 text-blue-600 border-blue-100 hover:border-blue-300' },
  Notion:     { active: 'bg-slate-700 text-white border-slate-700',   inactive: 'bg-slate-100 text-slate-600 border-slate-200 hover:border-slate-400' },
  '문서':     { active: 'bg-indigo-500 text-white border-indigo-500', inactive: 'bg-indigo-50 text-indigo-600 border-indigo-100 hover:border-indigo-300' },
  '기타':     { active: 'bg-gray-500 text-white border-gray-500',     inactive: 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-400' },
}

export default function ResourceFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const existing = id ? MOCK_EXISTING[id] : undefined

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: existing ?? { category: 'Figma' },
  })

  const urlValue = watch('url') ?? ''
  const descValue = watch('description') ?? ''

  const onSubmit = async (_data: FormValues) => {
    // TODO: API 연동
    navigate('/resources')
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
            <h1 className="text-[18px] font-bold text-gray-900">{isEdit ? '리소스 수정' : '리소스 등록'}</h1>
            <p className="text-[12px] text-gray-400 mt-0.5">{isEdit ? '리소스 정보를 수정합니다' : '팀에서 공유할 리소스를 등록합니다'}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_12px_rgba(30,58,138,0.07)] p-6 space-y-5">

            {/* 제목 */}
            <FormField label="제목" required error={errors.title?.message}>
              <input
                {...register('title')}
                placeholder="리소스 제목을 입력해주세요"
                className={inputCls(!!errors.title)}
              />
            </FormField>

            {/* URL */}
            <FormField label="URL" required error={errors.url?.message}>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <LinkIcon />
                </span>
                <input
                  {...register('url')}
                  placeholder="https://"
                  className={`${inputCls(!!errors.url)} pl-8 font-mono`}
                />
              </div>
              {urlValue && !errors.url && (
                <button
                  type="button"
                  onClick={() => window.open(urlValue, '_blank', 'noopener,noreferrer')}
                  className="mt-1.5 flex items-center gap-1 text-[11px] text-brand hover:underline"
                >
                  <ExternalLinkIcon />
                  링크 미리 열어보기
                </button>
              )}
            </FormField>

            {/* 카테고리 */}
            <FormField label="카테고리" required error={errors.category?.message}>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(CATEGORY_STYLES) as ResourceCategory[]).map((cat) => (
                  <label key={cat} className="cursor-pointer">
                    <input type="radio" {...register('category')} value={cat} className="sr-only" />
                    <span className={`inline-block px-3 py-1.5 rounded-lg border text-[12px] font-medium transition-colors ${
                      watch('category') === cat ? CATEGORY_STYLES[cat].active : CATEGORY_STYLES[cat].inactive
                    }`}>
                      {cat}
                    </span>
                  </label>
                ))}
              </div>
            </FormField>

            <div className="border-t border-gray-100" />

            {/* 설명 */}
            <FormField label="설명" required error={errors.description?.message}>
              <div className="relative">
                <textarea
                  {...register('description')}
                  placeholder="어떤 리소스인지 간략히 설명해주세요"
                  rows={3}
                  className={`${textareaCls(!!errors.description)} resize-none`}
                />
                <span className="absolute bottom-2.5 right-3 text-[11px] text-gray-300">{descValue.length} / 300</span>
              </div>
            </FormField>

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
              disabled={isSubmitting}
              className="h-9 px-5 text-[13px] font-semibold text-white bg-brand hover:bg-brand-hover rounded-lg transition-colors disabled:opacity-60 flex items-center gap-2"
            >
              {isSubmitting ? <><SpinnerIcon />{isEdit ? '수정 중...' : '등록 중...'}</> : isEdit ? '수정 완료' : '등록하기'}
            </button>
          </div>
        </form>

      </div>
    </div>
  )
}

// ── 폼 필드 래퍼 ─────────────────────────────────────
function FormField({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[12px] font-semibold text-gray-600 block">
        {label}
        {required && <span className="ml-1 text-red-400">*</span>}
      </label>
      {children}
      {error && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  )
}

// ── 스타일 헬퍼 ──────────────────────────────────────
const inputCls = (hasError: boolean) =>
  `w-full h-9 px-3 text-[13px] border rounded-lg focus:outline-none focus:ring-1 transition-colors ${
    hasError ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : 'border-gray-200 focus:border-brand focus:ring-brand/20'
  }`

const textareaCls = (hasError: boolean) =>
  `w-full px-3 py-2.5 text-[13px] border rounded-lg focus:outline-none focus:ring-1 transition-colors ${
    hasError ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : 'border-gray-200 focus:border-brand focus:ring-brand/20'
  }`

// ── SVG 아이콘 ────────────────────────────────────────
function BackIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M9 2.5L5 7L9 11.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

function LinkIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M5.5 8.5a3.5 3.5 0 005 0l2-2a3.536 3.536 0 00-5-5l-1 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M8.5 5.5a3.5 3.5 0 00-5 0l-2 2a3.536 3.536 0 005 5l1-1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function ExternalLinkIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 11 11" fill="none" aria-hidden="true">
      <path d="M4.5 2H2a1 1 0 00-1 1v6a1 1 0 001 1h6a1 1 0 001-1V6.5M6.5 1H10m0 0v3.5M10 1L5 6" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SpinnerIcon() {
  return <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>
}
