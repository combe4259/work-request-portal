import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { KBCategory } from '@/types/knowledge-base'
import { ChevronLeftIcon } from '@/components/common/Icons'
import { ErrorState, LoadingState } from '@/components/common/AsyncState'
import MarkdownRenderer from '@/components/common/MarkdownRenderer'
import { useCreateKnowledgeBaseArticleMutation, useUpdateKnowledgeBaseArticleMutation } from '@/features/knowledge-base/mutations'
import { useKnowledgeBaseArticleQuery } from '@/features/knowledge-base/queries'
import { useTeamMembersQuery } from '@/features/auth/queries'
import { useAuthStore } from '@/stores/authStore'

const schema = z.object({
  title: z.string().min(1, '제목을 입력해주세요').max(100),
  category: z.enum(['개발 가이드', '아키텍처', '트러블슈팅', '온보딩', '기타'] as const, { error: '카테고리를 선택해주세요' }),
  authorId: z.number().int().positive('작성자를 선택해주세요'),
  summary: z.string().min(1, '요약을 입력해주세요').max(300),
  content: z.string().min(1, '본문을 입력해주세요'),
})

type FormValues = z.infer<typeof schema>

const CATEGORIES: KBCategory[] = ['개발 가이드', '아키텍처', '트러블슈팅', '온보딩', '기타']
const PRESET_TAGS = [
  'Spring Boot', 'JWT', 'Security', 'MySQL', 'JPA', 'Hibernate', 'QueryDSL',
  'Redis', 'React', 'TypeScript', 'Docker', 'AWS', 'Git', 'CI/CD',
]

const CATEGORY_STYLES: Record<KBCategory, string> = {
  '개발 가이드': 'bg-blue-50 text-blue-600 border-blue-100',
  '아키텍처': 'bg-purple-50 text-purple-600 border-purple-100',
  '트러블슈팅': 'bg-red-50 text-red-500 border-red-100',
  '온보딩': 'bg-emerald-50 text-emerald-700 border-emerald-100',
  '기타': 'bg-gray-100 text-gray-500 border-gray-200',
}

const labelCls = 'block text-[12px] font-semibold text-gray-600 mb-1.5'
const inputCls = 'w-full h-9 px-3 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 bg-white'
const selectCls = 'w-full h-9 px-3 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 bg-white appearance-none cursor-pointer'
const textareaCls = 'w-full px-3 py-2.5 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 bg-white resize-none'
const errCls = 'mt-1 text-[11px] text-red-500'
const sectionCls = 'bg-white rounded-xl border border-blue-50 shadow-[0_2px_8px_rgba(30,58,138,0.05)] p-5'

export default function KnowledgeBaseFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = id != null
  const numericId = Number(id)
  const validEditId = isEdit && Number.isInteger(numericId) && numericId > 0 ? numericId : undefined
  const createArticle = useCreateKnowledgeBaseArticleMutation()
  const updateArticle = useUpdateKnowledgeBaseArticleMutation()
  const detailQuery = useKnowledgeBaseArticleQuery(validEditId)

  const currentUser = useAuthStore((state) => state.user)
  const currentTeam = useAuthStore((state) => state.currentTeam)
  const teamMembersQuery = useTeamMembersQuery(currentTeam?.id)

  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [customTagInput, setCustomTagInput] = useState('')
  const [isTagInputComposing, setIsTagInputComposing] = useState(false)
  const contentTextareaRef = useRef<HTMLTextAreaElement | null>(null)

  const authorOptions = useMemo(() => {
    const options = new Map<number, string>()
    if (currentUser) {
      options.set(currentUser.id, currentUser.name)
    }
    ;(teamMembersQuery.data ?? []).forEach((member) => {
      options.set(member.userId, member.name)
    })
    return Array.from(options.entries()).map(([id, name]) => ({ id, name }))
  }, [currentUser, teamMembersQuery.data])

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      category: '개발 가이드',
      authorId: currentUser?.id,
    },
  })

  const summaryVal = watch('summary') ?? ''
  const contentVal = watch('content') ?? ''
  const selectedCategory = watch('category')
  const contentField = register('content')

  useEffect(() => {
    if (!detailQuery.data) {
      return
    }

    reset({
      title: detailQuery.data.title,
      category: detailQuery.data.category,
      authorId: detailQuery.data.authorId,
      summary: detailQuery.data.summary,
      content: detailQuery.data.content,
    })
    setSelectedTags(detailQuery.data.tags)
  }, [detailQuery.data, reset])

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag])
  }

  const addCustomTag = () => {
    const value = customTagInput.trim()
    if (value.length === 0) {
      return
    }

    if (!selectedTags.includes(value)) {
      setSelectedTags((prev) => [...prev, value])
    }
    setCustomTagInput('')
  }

  const applyInlineWrap = (prefix: string, suffix: string, placeholder: string) => {
    const textarea = contentTextareaRef.current
    if (!textarea) {
      return
    }

    const value = textarea.value
    const start = textarea.selectionStart ?? value.length
    const end = textarea.selectionEnd ?? value.length
    const selected = value.slice(start, end)
    const target = selected || placeholder
    const inserted = `${prefix}${target}${suffix}`
    const next = value.slice(0, start) + inserted + value.slice(end)

    setValue('content', next, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    })

    requestAnimationFrame(() => {
      textarea.focus()
      if (selected) {
        const pos = start + inserted.length
        textarea.setSelectionRange(pos, pos)
      } else {
        const from = start + prefix.length
        textarea.setSelectionRange(from, from + target.length)
      }
    })
  }

  const applyCodeBlock = () => {
    const textarea = contentTextareaRef.current
    if (!textarea) {
      return
    }

    const value = textarea.value
    const start = textarea.selectionStart ?? value.length
    const end = textarea.selectionEnd ?? value.length
    const selected = value.slice(start, end)
    const target = selected || '코드를 입력하세요'
    const prefix = '```\\n'
    const suffix = '\\n```'
    const inserted = `${prefix}${target}${suffix}`
    const next = value.slice(0, start) + inserted + value.slice(end)

    setValue('content', next, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    })

    requestAnimationFrame(() => {
      textarea.focus()
      if (selected) {
        const pos = start + inserted.length
        textarea.setSelectionRange(pos, pos)
      } else {
        const from = start + prefix.length
        textarea.setSelectionRange(from, from + target.length)
      }
    })
  }

  const applyLink = () => {
    const textarea = contentTextareaRef.current
    if (!textarea) {
      return
    }

    const value = textarea.value
    const start = textarea.selectionStart ?? value.length
    const end = textarea.selectionEnd ?? value.length
    const selected = value.slice(start, end)
    const label = selected || '링크 텍스트'
    const defaultUrl = 'https://example.com'
    const inserted = `[${label}](${defaultUrl})`
    const next = value.slice(0, start) + inserted + value.slice(end)

    setValue('content', next, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    })

    requestAnimationFrame(() => {
      textarea.focus()
      const urlStart = start + label.length + 3
      textarea.setSelectionRange(urlStart, urlStart + defaultUrl.length)
    })
  }

  const onSubmit = async (data: FormValues) => {
    if (validEditId != null) {
      await updateArticle.mutateAsync({
        id: validEditId,
        title: data.title,
        category: data.category,
        tags: selectedTags,
        summary: data.summary,
        content: data.content,
      })

      navigate(`/knowledge-base/${validEditId}`)
      return
    }

    const result = await createArticle.mutateAsync({
      title: data.title,
      category: data.category,
      authorId: data.authorId,
      tags: selectedTags,
      summary: data.summary,
      content: data.content,
    })

    navigate(`/knowledge-base/${result.id}`)
  }

  if (isEdit && validEditId == null) {
    return (
      <div className="p-6">
        <ErrorState
          title="잘못된 접근입니다"
          description="문서 ID가 올바르지 않습니다."
          actionLabel="목록으로 이동"
          onAction={() => navigate('/knowledge-base')}
        />
      </div>
    )
  }

  if (isEdit && detailQuery.isPending) {
    return (
      <div className="p-6">
        <LoadingState title="문서 정보를 불러오는 중입니다" description="잠시만 기다려주세요." />
      </div>
    )
  }

  if (isEdit && (detailQuery.isError || !detailQuery.data)) {
    return (
      <div className="p-6">
        <ErrorState
          title="문서 정보를 불러오지 못했습니다"
          description="잠시 후 다시 시도해주세요."
          actionLabel="다시 시도"
          onAction={() => {
            void detailQuery.refetch()
          }}
        />
      </div>
    )
  }

  const isMutating = createArticle.isPending || updateArticle.isPending

  return (
    <div className="min-h-full p-6 flex flex-col items-center">
      <div className="w-full max-w-[720px] space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/knowledge-base')}
            className="flex items-center gap-1 text-[13px] text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ChevronLeftIcon />
            목록
          </button>
          <div className="w-px h-4 bg-gray-200" />
          <h1 className="text-[18px] font-bold text-gray-900">{isEdit ? '문서 수정' : '문서 등록'}</h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className={sectionCls}>
            <h2 className="text-[13px] font-bold text-gray-700 mb-4">기본 정보</h2>

            <div className="mb-4">
              <label className={labelCls}>제목 <span className="text-red-400">*</span></label>
              <input {...register('title')} placeholder="문서 제목을 입력해주세요" className={inputCls} />
              {errors.title && <p className={errCls}>{errors.title.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>카테고리 <span className="text-red-400">*</span></label>
                <div className="relative">
                  <select {...register('category')} className={selectCls}>
                    {CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
                  </select>
                  <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </span>
                </div>
                {selectedCategory && (
                  <span className={`inline-block mt-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${CATEGORY_STYLES[selectedCategory as KBCategory]}`}>
                    {selectedCategory}
                  </span>
                )}
                {errors.category && <p className={errCls}>{errors.category.message}</p>}
              </div>

              <div>
                <label className={labelCls}>작성자 <span className="text-red-400">*</span></label>
                <div className="relative">
                  <select {...register('authorId', { valueAsNumber: true })} className={selectCls}>
                    <option value="">선택</option>
                    {authorOptions.map((option) => (
                      <option key={option.id} value={option.id}>{option.name}</option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </span>
                </div>
                {errors.authorId && <p className={errCls}>{errors.authorId.message}</p>}
              </div>
            </div>
          </div>

          <div className={sectionCls}>
            <h2 className="text-[13px] font-bold text-gray-700 mb-3">기술 태그</h2>

            <div className="flex flex-wrap gap-1.5 mb-3">
              {PRESET_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`h-6 px-2 rounded-md text-[11px] font-medium transition-colors ${
                    selectedTags.includes(tag)
                      ? 'bg-brand/10 text-brand border border-brand/20'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={customTagInput}
                onChange={(event) => setCustomTagInput(event.target.value)}
                onCompositionStart={() => setIsTagInputComposing(true)}
                onCompositionEnd={() => setIsTagInputComposing(false)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !isTagInputComposing && !event.nativeEvent.isComposing) {
                    event.preventDefault()
                    addCustomTag()
                  }
                }}
                placeholder="직접 입력 후 Enter 또는 추가 클릭"
                className={`${inputCls} flex-1`}
              />
              <button
                type="button"
                onClick={addCustomTag}
                disabled={!customTagInput.trim()}
                className="h-9 px-3 text-[12px] text-brand border border-brand/30 rounded-lg hover:bg-brand/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap"
              >
                추가
              </button>
            </div>

            {selectedTags.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5 items-center">
                <span className="text-[11px] text-gray-400 mr-1">선택됨</span>
                {selectedTags.map((tag) => (
                  <span key={tag} className="flex items-center gap-1 h-6 pl-2 pr-1 bg-brand/10 text-brand rounded-md text-[11px] font-medium border border-brand/20">
                    {tag}
                    <button
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className="text-brand/50 hover:text-brand transition-colors"
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className={sectionCls}>
            <h2 className="text-[13px] font-bold text-gray-700 mb-4">내용</h2>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <label className={`${labelCls} mb-0`}>요약 <span className="text-red-400">*</span></label>
                <span className={`text-[11px] ${summaryVal.length > 280 ? 'text-amber-500' : 'text-gray-400'}`}>
                  {summaryVal.length} / 300
                </span>
              </div>
              <textarea
                {...register('summary')}
                rows={3}
                placeholder="문서 내용을 한두 문장으로 요약해주세요"
                className={textareaCls}
              />
              {errors.summary && <p className={errCls}>{errors.summary.message}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={`${labelCls} mb-0`}>본문 <span className="text-red-400">*</span></label>
                <span className="text-[11px] text-gray-300">{contentVal.length}자</span>
              </div>
              <p className="text-[11px] text-gray-400 mb-2">
                지원 문법: <code className="px-1 py-0.5 bg-gray-100 rounded"># 제목</code>, <code className="px-1 py-0.5 bg-gray-100 rounded">**강조**</code>, <code className="px-1 py-0.5 bg-gray-100 rounded">- 목록</code>, <code className="px-1 py-0.5 bg-gray-100 rounded">```코드```</code>, <code className="px-1 py-0.5 bg-gray-100 rounded">|테이블|</code>
              </p>
              <div className="flex items-center gap-1.5 mb-2">
                <ToolbarButton label="굵게" onClick={() => applyInlineWrap('**', '**', '강조 텍스트')} />
                <ToolbarButton label="코드블록" onClick={applyCodeBlock} />
                <ToolbarButton label="링크" onClick={applyLink} />
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                <textarea
                  {...contentField}
                  ref={(element) => {
                    contentField.ref(element)
                    contentTextareaRef.current = element
                  }}
                  rows={14}
                  placeholder={`마크다운 형식으로 작성하세요.\n\n## 개요\n...\n\n## 상세 내용\n...`}
                  className={`${textareaCls} font-mono text-[12px] leading-relaxed`}
                />
                <div className="rounded-lg border border-gray-200 bg-gray-50/40 px-3 py-2.5 min-h-[312px] max-h-[312px] overflow-y-auto">
                  <p className="text-[11px] font-semibold text-gray-500 mb-2">실시간 미리보기</p>
                  <MarkdownRenderer
                    content={contentVal}
                    emptyMessage="본문을 입력하면 마크다운 미리보기가 표시됩니다."
                    className="text-[13px]"
                  />
                </div>
              </div>
              {errors.content && <p className={errCls}>{errors.content.message}</p>}
            </div>
          </div>

          <div className="flex justify-end gap-2 pb-6">
            <button
              type="button"
              onClick={() => navigate('/knowledge-base')}
              className="h-8 px-3 text-[13px] text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isMutating}
              className="h-8 px-4 bg-brand hover:bg-brand-hover text-white text-[13px] font-semibold rounded-lg transition-colors disabled:opacity-60"
            >
              {isMutating ? (isEdit ? '수정 중...' : '등록 중...') : (isEdit ? '수정 완료' : '등록')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ToolbarButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-7 px-2.5 text-[11px] font-medium text-gray-600 border border-gray-200 rounded-md bg-white hover:bg-gray-50 hover:border-gray-300 transition-colors"
    >
      {label}
    </button>
  )
}
