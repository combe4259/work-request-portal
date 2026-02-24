import { useQuery } from '@tanstack/react-query'
import { listMeetingNotes, type MeetingNoteListParams } from './service'

export const meetingNoteQueryKeys = {
  all: ['meeting-notes'] as const,
  list: (params: MeetingNoteListParams) => [...meetingNoteQueryKeys.all, 'list', params] as const,
}

export function useMeetingNotesQuery(params: MeetingNoteListParams) {
  return useQuery({
    queryKey: meetingNoteQueryKeys.list(params),
    queryFn: () => listMeetingNotes(params),
    placeholderData: (prev) => prev,
  })
}
