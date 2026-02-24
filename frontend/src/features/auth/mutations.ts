import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createTeam, joinTeam, login, removeTeamMember, signup, updateTeamMemberRole, type TeamRole } from './service'
import { authQueryKeys } from './queries'

export function useSignupMutation() {
  return useMutation({
    mutationFn: signup,
  })
}

export function useLoginMutation() {
  return useMutation({
    mutationFn: login,
  })
}

export function useCreateTeamMutation() {
  return useMutation({
    mutationFn: createTeam,
  })
}

export function useJoinTeamMutation() {
  return useMutation({
    mutationFn: joinTeam,
  })
}

export function useRemoveTeamMemberMutation(teamId: number | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (userId: number) => {
      if (typeof teamId !== 'number') {
        throw new Error('팀 정보가 없습니다.')
      }
      await removeTeamMember(teamId, userId)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authQueryKeys.teamMembers(teamId) })
    },
  })
}

export function useUpdateTeamMemberRoleMutation(teamId: number | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { userId: number; teamRole: TeamRole }) => {
      if (typeof teamId !== 'number') {
        throw new Error('팀 정보가 없습니다.')
      }
      await updateTeamMemberRole(teamId, payload.userId, payload.teamRole)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authQueryKeys.teamMembers(teamId) })
    },
  })
}
