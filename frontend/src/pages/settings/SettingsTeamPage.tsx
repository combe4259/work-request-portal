import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/AsyncState'
import InviteCodeCard from '@/components/team/InviteCodeCard'
import { useRemoveTeamMemberMutation, useUpdateTeamMemberRoleMutation } from '@/features/auth/mutations'
import { useTeamMembersQuery } from '@/features/auth/queries'
import { useAuthStore } from '@/stores/authStore'
import type { TeamRole } from '@/features/auth/service'

const ROLE_BADGE: Record<string, string> = {
  OWNER: 'bg-blue-50 text-blue-600 border border-blue-100',
  ADMIN: 'bg-violet-50 text-violet-600 border border-violet-100',
  MEMBER: 'bg-gray-100 text-gray-600 border border-gray-200',
}

const ROLE_LABEL: Record<string, string> = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  MEMBER: 'MEMBER',
}

const ROLE_OPTIONS: TeamRole[] = ['OWNER', 'ADMIN', 'MEMBER']

export default function SettingsTeamPage() {
  const navigate = useNavigate()
  const { currentTeam, teams, user } = useAuthStore()
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [updatingRoleUserId, setUpdatingRoleUserId] = useState<number | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)

  const teamId = currentTeam?.id
  const canManageMembers = currentTeam?.teamRole === 'OWNER'
  const inviteCode = currentTeam?.inviteCode ?? teams.find((team) => team.id === teamId)?.inviteCode
  const membersQuery = useTeamMembersQuery(teamId)
  const removeMutation = useRemoveTeamMemberMutation(teamId)
  const updateRoleMutation = useUpdateTeamMemberRoleMutation(teamId)

  const handleRemove = async (userId: number) => {
    setServerError(null)
    try {
      await removeMutation.mutateAsync(userId)
      setConfirmId(null)
    } catch (error) {
      setServerError(resolveErrorMessage(error, '팀 멤버 제거 중 오류가 발생했습니다.'))
    }
  }

  const handleRoleChange = async (userId: number, nextRole: TeamRole) => {
    setServerError(null)
    setUpdatingRoleUserId(userId)
    try {
      await updateRoleMutation.mutateAsync({ userId, teamRole: nextRole })
    } catch (error) {
      setServerError(resolveErrorMessage(error, '팀 역할 변경 중 오류가 발생했습니다.'))
    } finally {
      setUpdatingRoleUserId(null)
    }
  }

  if (!currentTeam) {
    return (
      <div className="p-6 max-w-[800px] mx-auto">
        <EmptyState
          title="선택된 팀이 없습니다"
          description="팀 선택 후 다시 시도해주세요."
          actionLabel="뒤로 가기"
          onAction={() => navigate(-1)}
        />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-[800px] mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
          aria-label="뒤로 가기"
        >
          <BackIcon />
        </button>
        <div>
          <h1 className="text-[20px] font-bold text-gray-900">팀 관리</h1>
          <p className="text-[12px] text-gray-400 mt-0.5">{currentTeam.name}</p>
        </div>
      </div>

      {serverError && (
        <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2.5 mb-4">
          <p className="text-xs text-red-600">{serverError}</p>
        </div>
      )}

      <div className="mb-4">
        <InviteCodeCard
          inviteCode={inviteCode}
          title="팀 초대 코드"
          description="새 멤버에게 이 코드를 전달하면 팀에 참여할 수 있습니다."
        />
      </div>

      <div className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_12px_rgba(30,58,138,0.07)] overflow-hidden">
        {membersQuery.isPending ? (
          <LoadingState title="팀 멤버를 불러오는 중입니다" description="잠시만 기다려주세요." />
        ) : membersQuery.isError ? (
          <ErrorState
            title="팀 멤버를 불러오지 못했습니다"
            description="잠시 후 다시 시도해주세요."
            actionLabel="다시 시도"
            onAction={() => {
              void membersQuery.refetch()
            }}
          />
        ) : (membersQuery.data?.length ?? 0) === 0 ? (
          <EmptyState title="팀 멤버가 없습니다" description="아직 참여한 멤버가 없습니다." />
        ) : (
          <>
            <div className="px-5 py-3 bg-gray-50/70 border-b border-gray-100">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[12px] text-gray-500">총 {membersQuery.data?.length ?? 0}명</p>
                {!canManageMembers && (
                  <p className="text-[11px] text-gray-400">멤버 권한 변경/제거는 OWNER만 가능합니다.</p>
                )}
              </div>
            </div>

            <table className="w-full">
              <thead className="bg-gray-50/70 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 tracking-wide">이름</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 tracking-wide">이메일</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 tracking-wide">팀 역할</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {(membersQuery.data ?? []).map((member) => (
                  <tr key={member.userId} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
                          style={{ backgroundColor: stringToColor(member.name) }}
                        >
                          {member.name[0]}
                        </div>
                        <span className="text-[13px] font-medium text-gray-800">{member.name}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span className="text-[12px] text-gray-500">{member.email}</span>
                    </td>

                    <td className="px-4 py-3">
                      {member.userId === user?.id ? (
                        <RoleBadge role={member.teamRole} />
                      ) : !canManageMembers ? (
                        <RoleBadge role={member.teamRole} />
                      ) : (
                        <select
                          value={member.teamRole}
                          disabled={updateRoleMutation.isPending || updatingRoleUserId === member.userId}
                          onChange={(event) => {
                            const nextRole = event.target.value as TeamRole
                            if (nextRole !== member.teamRole) {
                              void handleRoleChange(member.userId, nextRole)
                            }
                          }}
                          className="h-7 rounded-md border border-gray-200 bg-white px-2 text-[11px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-brand/20"
                        >
                          {ROLE_OPTIONS.map((role) => (
                            <option key={role} value={role}>
                              {ROLE_LABEL[role]}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right">
                      {member.userId === user?.id ? (
                        <span className="text-[11px] text-gray-400">나</span>
                      ) : !canManageMembers ? (
                        <span className="text-[11px] text-gray-300">-</span>
                      ) : confirmId === member.userId ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-[11px] text-gray-500">제거할까요?</span>
                          <button
                            onClick={() => {
                              void handleRemove(member.userId)
                            }}
                            disabled={removeMutation.isPending || updateRoleMutation.isPending}
                            className="h-6 px-2.5 text-[11px] font-semibold text-white bg-red-500 hover:bg-red-600 rounded-md transition-colors disabled:opacity-60"
                          >
                            확인
                          </button>
                          <button
                            onClick={() => setConfirmId(null)}
                            className="h-6 px-2.5 text-[11px] font-medium text-gray-500 border border-gray-200 hover:bg-gray-50 rounded-md transition-colors"
                          >
                            취소
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmId(member.userId)}
                          className="h-7 px-3 text-[11px] font-medium text-gray-400 border border-gray-200 rounded-lg hover:border-red-200 hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                          제거
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  )
}

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`inline-flex text-[11px] font-medium px-2 py-0.5 rounded-full ${ROLE_BADGE[role] ?? 'bg-gray-100 text-gray-500'}`}>
      {ROLE_LABEL[role] ?? role}
    </span>
  )
}

function resolveErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message
    if (typeof message === 'string' && message.trim()) {
      return message
    }
  }
  return fallback
}

function stringToColor(str: string) {
  const palette = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#F43F5E', '#6366F1', '#64748B']
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return palette[Math.abs(hash) % palette.length]
}

function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
