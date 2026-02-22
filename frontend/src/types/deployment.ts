export type DeployType = '정기배포' | '긴급패치' | '핫픽스' | '롤백' | '기타'
export type DeployEnv = '개발' | '스테이징' | '운영'
export type DeployStatus = '대기' | '진행중' | '완료' | '실패' | '롤백'

export interface Deployment {
  id: string
  docNo: string
  title: string
  version: string
  type: DeployType
  env: DeployEnv
  status: DeployStatus
  manager: string
  deployDate: string   // 배포 예정일
}
