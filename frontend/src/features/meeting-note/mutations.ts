import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createMeetingNote, deleteMeetingNote } from './service'
import { meetingNoteQueryKeys } from './queries'

export function useCreateMeetingNoteMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createMeetingNote,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: meetingNoteQueryKeys.all })
    },
  })
}

export function useDeleteMeetingNoteMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteMeetingNote,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: meetingNoteQueryKeys.all })
    },
  })
}
