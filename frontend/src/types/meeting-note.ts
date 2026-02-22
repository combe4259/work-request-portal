export interface ActionItem {
  id: number
  content: string
  assignee: string
  deadline: string
  done: boolean
}

export interface MeetingNote {
  id: string
  docNo: string
  title: string
  date: string
  location: string
  facilitator: string
  createdAt: string
}
