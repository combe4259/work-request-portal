import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createWorkRequest, deleteWorkRequest, updateWorkRequest, updateWorkRequestStatus } from './service'
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

export function useUpdateWorkRequestMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateWorkRequest,
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: workRequestQueryKeys.all })
      await queryClient.invalidateQueries({ queryKey: workRequestQueryKeys.detail(variables.id) })
      await queryClient.invalidateQueries({ queryKey: workRequestQueryKeys.relatedRefs(variables.id) })
    },
  })
}

export function useDeleteWorkRequestMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteWorkRequest,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: workRequestQueryKeys.all })
    },
  })
}
