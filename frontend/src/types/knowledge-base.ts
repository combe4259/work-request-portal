export type KBCategory = '개발 가이드' | '아키텍처' | '트러블슈팅' | '온보딩' | '기타'

export interface KBArticle {
  id: string
  docNo: string
  title: string
  category: KBCategory
  tags: string[]
  summary: string
  authorId: number
  author: string
  relatedDocs: string[]   // TK/WR/DF 문서번호
  createdAt: string
  updatedAt: string
  views: number
}

export interface KBArticleDetail {
  id: string
  docNo: string
  teamId: number
  title: string
  category: KBCategory
  tags: string[]
  summary: string
  content: string
  authorId: number
  author: string
  createdAt: string
  updatedAt: string
  views: number
  relatedDocs: Array<{ docNo: string; title: string }>
  attachments: Array<{ name: string; size: string }>
}
