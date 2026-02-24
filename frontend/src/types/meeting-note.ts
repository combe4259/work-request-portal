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
  facilitator: string
  actionTotal: number
  actionDone: number
  createdAt: string
}
