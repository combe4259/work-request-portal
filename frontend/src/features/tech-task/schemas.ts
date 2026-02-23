import { z } from 'zod'

export const techTaskFormSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요').max(100, '제목은 100자 이하이어야 합니다'),
  type: z.enum(['리팩토링', '기술부채', '성능개선', '보안', '테스트', '기타'] as const, { error: '유형을 선택해주세요' }),
  priority: z.enum(['긴급', '높음', '보통', '낮음'] as const, { error: '우선순위를 선택해주세요' }),
  deadline: z.string().min(1, '마감일을 선택해주세요'),
  assignee: z.string().optional(),
  currentIssue: z.string().min(1, '문제 현황을 입력해주세요').max(2000),
  solution: z.string().min(1, '개선 방안을 입력해주세요').max(2000),
})

export type TechTaskFormValues = z.infer<typeof techTaskFormSchema>
