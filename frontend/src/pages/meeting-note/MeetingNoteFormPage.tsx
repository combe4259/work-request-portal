import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormField } from '@/components/common/FormField'
import { inputCls, selectCls } from '@/lib/formStyles'

const FACILITATORS = ['박PM', '이설계', '김개발', '최설계', '최HR', '박디자인']

const schema = z.object({
  title: z.string().min(1, '회의 제목을 입력해주세요'),
  date: z.string().min(1, '회의 날짜를 선택해주세요'),
  facilitator: z.string().min(1, '진행자를 선택해주세요'),
})

type FormValues = z.infer<typeof schema>

export default function MeetingNoteFormPage() {
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      date: new Date().toISOString().split('T')[0],
      facilitator: FACILITATORS[0],
    },
  })

  const onSubmit = async (_data: FormValues) => {
    setIsSubmitting(true)
    await new Promise((r) => setTimeout(r, 600)) // TODO: API 연동 후 생성된 id로 navigate
    navigate('/meeting-notes/6')
  }

  return (
    <div className="min-h-full p-6 flex flex-col items-center">
      <div className="w-full max-w-[720px] space-y-5">

        {/* 헤더 */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
            aria-label="뒤로 가기"
          >
            <BackIcon />
          </button>
          <div>
            <h1 className="text-[20px] font-bold text-gray-900">회의록 등록</h1>
            <p className="text-[12px] text-gray-400 mt-0.5">기본 정보 입력 후 편집 페이지로 이동합니다</p>
          </div>
        </div>

        {/* 폼 카드 */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_12px_rgba(30,58,138,0.07)] p-6 space-y-5"
        >
          <FormField label="회의 제목" required error={errors.title?.message}>
            <input
              {...register('title')}
              placeholder="예) 3월 스프린트 킥오프 회의"
              className={inputCls(!!errors.title)}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="회의 날짜" required error={errors.date?.message}>
              <input
                type="date"
                {...register('date')}
                className={inputCls(!!errors.date)}
              />
            </FormField>

            <FormField label="진행자" required error={errors.facilitator?.message}>
              <select {...register('facilitator')} className={selectCls(!!errors.facilitator)}>
                {FACILITATORS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </FormField>
          </div>

          {/* 안내 */}
          <div className="flex items-start gap-2.5 p-3 bg-blue-50/60 rounded-lg border border-blue-100">
            <InfoIcon />
            <p className="text-[12px] text-blue-600 leading-relaxed">
              등록 후 편집 페이지에서 안건, 회의 내용, 결정 사항, 액션 아이템을 작성할 수 있습니다.
              내용은 자동 저장됩니다.
            </p>
          </div>

          {/* 버튼 */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="h-9 px-4 text-[13px] font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-9 px-5 text-[13px] font-semibold text-white bg-brand hover:bg-brand-hover rounded-lg transition-colors disabled:opacity-60 flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <><SpinnerIcon />등록 중...</>
              ) : (
                '등록 후 편집'
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  )
}

// ── SVG 아이콘 ────────────────────────────────────────
function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function InfoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-blue-500 flex-shrink-0 mt-0.5" aria-hidden="true">
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2" />
      <line x1="7" y1="6" x2="7" y2="10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="7" cy="4.5" r="0.5" fill="currentColor" />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="2" strokeOpacity="0.25" />
      <path d="M7 2a5 5 0 0 1 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
