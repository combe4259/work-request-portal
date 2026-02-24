import api from '@/lib/api'
import type { LoginRequest, LoginResponse, SignupRequest, SignupResponse, Team } from '@/types/auth'

export async function signup(payload: SignupRequest): Promise<SignupResponse> {
  const { data } = await api.post<SignupResponse>('/auth/signup', payload)
  return data
}

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/login', payload)
  return data
}

export async function me(): Promise<LoginResponse> {
  const { data } = await api.get<LoginResponse>('/auth/me')
  return data
}

export interface CreateTeamRequest {
  name: string
  description?: string
}

export interface JoinTeamRequest {
  inviteCode: string
}

export async function createTeam(payload: CreateTeamRequest): Promise<Team> {
  const { data } = await api.post<Team>('/teams', payload)
  return data
}

export async function joinTeam(payload: JoinTeamRequest): Promise<Team> {
  const { data } = await api.post<Team>('/teams/join', payload)
  return data
}

export async function getMyTeams(): Promise<Team[]> {
  const { data } = await api.get<Team[]>('/teams/mine')
  return data
}

export interface TeamMember {
  userId: number
  name: string
  email: string
  teamRole: 'OWNER' | 'ADMIN' | 'MEMBER'
}

export type TeamRole = TeamMember['teamRole']

export async function getTeamMembers(teamId: number): Promise<TeamMember[]> {
  const { data } = await api.get<TeamMember[]>(`/teams/${teamId}/members`)
  return data
}

export async function removeTeamMember(teamId: number, userId: number): Promise<void> {
  await api.delete(`/teams/${teamId}/members/${userId}`)
}

export async function updateTeamMemberRole(teamId: number, userId: number, teamRole: TeamRole): Promise<void> {
  await api.patch(`/teams/${teamId}/members/${userId}/role`, { teamRole })
}
