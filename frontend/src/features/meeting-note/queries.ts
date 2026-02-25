import { useQuery } from '@tanstack/react-query'
import { getMeetingNote, listMeetingNotes, type MeetingNoteListParams } from './service'

export const meetingNoteQueryKeys = {
  all: ['meeting-notes'] as const,
  list: (params: MeetingNoteListParams) => [...meetingNoteQueryKeys.all, 'list', params] as const,
  detail: (id: string | number) => [...meetingNoteQueryKeys.all, 'detail', id] as const,
}

export function useMeetingNotesQuery(params: MeetingNoteListParams) {
  return useQuery({
    queryKey: meetingNoteQueryKeys.list(params),
    queryFn: () => listMeetingNotes(params),
    placeholderData: (prev) => prev,
  })
}

export function useMeetingNoteDetailQuery(id: string | number | undefined) {
  return useQuery({
    queryKey: id == null ? [...meetingNoteQueryKeys.all, 'detail', 'none'] : meetingNoteQueryKeys.detail(id),
    queryFn: () => getMeetingNote(id as string | number),
    enabled: id != null,
  })
}
