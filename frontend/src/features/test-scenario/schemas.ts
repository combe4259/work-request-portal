import { z } from 'zod'

export const testScenarioFormSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요').max(100),
  type: z.enum(['기능', '회귀', '통합', 'E2E', '성능', '보안', '기타'] as const, { error: '유형을 선택해주세요' }),
  priority: z.enum(['긴급', '높음', '보통', '낮음'] as const, { error: '우선순위를 선택해주세요' }),
  deadline: z.string().min(1, '마감일을 선택해주세요'),
  assignee: z.string().optional(),
  precondition: z.string().max(1000).optional(),
})

export type TestScenarioFormValues = z.infer<typeof testScenarioFormSchema>
