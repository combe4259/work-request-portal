export type UserRole = 'PM' | 'TEAM_LEAD' | 'DEVELOPER' | 'REQUESTER'
export type TeamRole = 'OWNER' | 'ADMIN' | 'MEMBER'

export interface User {
  id: number
  name: string
  email: string
  role: UserRole
  slackUserId?: string
}

export interface Team {
  id: number
  name: string
  description?: string
  teamRole: TeamRole
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  user: User
  teams: Team[]
}
