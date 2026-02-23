import { z } from 'zod'

export const defectFormSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요').max(100),
  type: z.enum(['UI', '기능', '성능', '보안', '데이터', '기타'] as const, { error: '유형을 선택해주세요' }),
  severity: z.enum(['치명적', '높음', '보통', '낮음'] as const, { error: '심각도를 선택해주세요' }),
  deadline: z.string().min(1, '마감일을 선택해주세요'),
  assignee: z.string().optional(),
  environment: z.string().max(200).optional(),
  expected: z.string().min(1, '기대 동작을 입력해주세요').max(1000),
  actual: z.string().min(1, '실제 동작을 입력해주세요').max(1000),
})

export type DefectFormValues = z.infer<typeof defectFormSchema>
