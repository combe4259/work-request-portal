export type RequestType = '기능개선' | '신규개발' | '버그수정' | '인프라' | '기타'
export type Priority = '긴급' | '높음' | '보통' | '낮음'
export type Status = '접수대기' | '검토중' | '개발중' | '테스트중' | '완료' | '반려'

export interface WorkRequest {
  id: string
  docNo: string
  title: string
  type: RequestType
  priority: Priority
  status: Status
  assignee: string
  deadline: string
}
