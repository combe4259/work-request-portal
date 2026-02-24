import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createWorkRequest, updateWorkRequestStatus } from './service'
import { workRequestQueryKeys } from './queries'
import type { Status } from '@/types/work-request'

export function useCreateWorkRequestMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createWorkRequest,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: workRequestQueryKeys.all })
    },
  })
}

export function useUpdateWorkRequestStatusMutation(id: string | number | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (status: Status) => {
      if (id == null) {
        throw new Error('업무요청 ID가 없습니다.')
      }
      await updateWorkRequestStatus(id, status)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: workRequestQueryKeys.all })
      if (id != null) {
        await queryClient.invalidateQueries({ queryKey: workRequestQueryKeys.detail(id) })
      }
    },
  })
}
