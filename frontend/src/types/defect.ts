export type DefectType = 'UI' | '기능' | '성능' | '보안' | '데이터' | '기타'
export type Severity = '치명적' | '높음' | '보통' | '낮음'
export type DefectStatus = '접수' | '분석중' | '수정중' | '검증중' | '완료' | '재현불가' | '보류'

export interface Defect {
  id: string
  docNo: string
  title: string
  type: DefectType
  severity: Severity
  status: DefectStatus
  reporter: string    // 발견자
  assignee: string    // 담당자
  relatedDoc: string  // 연관 TS/WR 문서번호
  deadline: string
}
