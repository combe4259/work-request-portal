import { z } from 'zod'

export const workRequestFormSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요').max(100, '제목은 100자 이하이어야 합니다'),
  type: z.enum(['기능개선', '신규개발', '버그수정', '인프라', '기타'] as const, { error: '유형을 선택해주세요' }),
  priority: z.enum(['긴급', '높음', '보통', '낮음'] as const, { error: '우선순위를 선택해주세요' }),
  deadline: z.string().min(1, '마감일을 선택해주세요'),
  assignee: z.string().optional(),
  background: z.string().max(500, '500자 이하이어야 합니다').optional(),
  description: z.string().min(1, '내용을 입력해주세요').max(2000, '내용은 2000자 이하이어야 합니다'),
})

export type WorkRequestFormValues = z.infer<typeof workRequestFormSchema>
