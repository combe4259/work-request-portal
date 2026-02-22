export type TechTaskType = '리팩토링' | '기술부채' | '성능개선' | '보안' | '테스트' | '기타'
export type Priority = '긴급' | '높음' | '보통' | '낮음'
export type Status = '접수대기' | '검토중' | '개발중' | '테스트중' | '완료' | '반려'

export interface TechTask {
  id: string
  docNo: string
  title: string
  type: TechTaskType
  priority: Priority
  status: Status
  assignee: string
  deadline: string
}
