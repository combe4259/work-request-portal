import { useAuthStore } from '@/stores/authStore'
import { getTeamMembers } from './service'

export async function resolveTeamMemberIdByName(
  teamId: number,
  memberName?: string | null
): Promise<number | null> {
  const normalizedName = memberName?.trim()
  if (!normalizedName || normalizedName === '미배정') {
    return null
  }

  const authUser = useAuthStore.getState().user
  if (authUser && authUser.name === normalizedName) {
    return authUser.id
  }

  const legacyIdMatch = normalizedName.match(/^사용자#(\d+)$/)
  if (legacyIdMatch) {
    const parsedId = Number(legacyIdMatch[1])
    if (Number.isInteger(parsedId) && parsedId > 0) {
      return parsedId
    }
  }

  try {
    const teamMembers = await getTeamMembers(teamId)
    const matched = teamMembers.find((member) => member.name === normalizedName)
    return matched?.userId ?? null
  } catch {
    return null
  }
}
