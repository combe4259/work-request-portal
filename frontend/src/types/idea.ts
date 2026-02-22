export type IdeaCategory = 'UX/UI' | '기능' | '인프라' | '프로세스' | '기타'
export type IdeaStatus = '제안됨' | '검토중' | '채택' | '보류' | '기각'

export interface Idea {
  id: string
  docNo: string
  title: string
  category: IdeaCategory
  status: IdeaStatus
  content: string
  proposer: string
  likes: number
  commentCount: number
  createdAt: string
}
