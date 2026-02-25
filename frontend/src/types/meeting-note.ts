export interface ActionItem {
  id: number
  content: string
  assigneeId: number
  assignee: string
  deadline: string
  done: boolean
}

export interface RelatedDoc {
  docNo: string
  title: string
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

export interface MeetingNoteDetail {
  id: string
  docNo: string
  teamId: number
  title: string
  date: string
  location: string
  facilitatorId: number
  facilitator: string
  attendeeIds: number[]
  agenda: string[]
  content: string
  decisions: string[]
  actionItems: ActionItem[]
  relatedDocs: RelatedDoc[]
}
