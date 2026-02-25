import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createDefect, deleteDefect, updateDefect, updateDefectStatus } from './service'
import { defectQueryKeys } from './queries'
import type { DefectStatus } from '@/types/defect'

export function useCreateDefectMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createDefect,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: defectQueryKeys.all })
    },
  })
}

export function useUpdateDefectMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateDefect,
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: defectQueryKeys.all })
      await queryClient.invalidateQueries({ queryKey: defectQueryKeys.detail(variables.id) })
    },
  })
}

export function useUpdateDefectStatusMutation(id: string | number | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (status: DefectStatus) => {
      if (id == null) {
        throw new Error('결함 ID가 없습니다.')
      }
      await updateDefectStatus(id, status)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: defectQueryKeys.all })
      if (id != null) {
        await queryClient.invalidateQueries({ queryKey: defectQueryKeys.detail(id) })
      }
    },
  })
}

export function useDeleteDefectMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteDefect,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: defectQueryKeys.all })
    },
  })
}
