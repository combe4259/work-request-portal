export type TestScenarioType = '기능' | '회귀' | '통합' | 'E2E' | '성능' | '보안' | '기타'
export type Priority = '긴급' | '높음' | '보통' | '낮음'
export type TestStatus = '작성중' | '검토중' | '승인됨' | '실행중' | '통과' | '실패' | '보류'

export interface TestScenario {
  id: string
  docNo: string
  title: string
  type: TestScenarioType
  priority: Priority
  status: TestStatus
  assignee: string
  relatedDoc: string   // 연관 WR/TK 문서번호
  deadline: string
}
