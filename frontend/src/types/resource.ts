export type ResourceCategory = 'Figma' | 'Notion' | 'GitHub' | 'Confluence' | '문서' | '기타'

export interface Resource {
  id: string
  title: string
  url: string
  category: ResourceCategory
  description: string
  registeredBy: string
  createdAt: string
}
