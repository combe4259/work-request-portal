import api from '@/lib/api'

export type SettingsRole = 'PM' | 'CTO' | '개발자' | '디자이너' | 'QA' | '기획자'

export interface UserProfileResponse {
  name: string
  email: string
  role: SettingsRole
  avatarColor: string
  photoUrl: string | null
}

export interface UserProfileUpdateRequest {
  name: string
  email: string
  role: SettingsRole
  avatarColor: string
  photoUrl: string | null
}

export interface UserPreferencesResponse {
  notification: {
    assign: boolean
    comment: boolean
    deadline: boolean
    status: boolean
    deploy: boolean
    mention: boolean
  }
  display: {
    landing: '/dashboard' | '/work-requests' | '/tech-tasks'
    rowCount: 10 | 20 | 50
  }
}

export interface UserPreferencesUpdateRequest {
  notification: UserPreferencesResponse['notification']
  display: UserPreferencesResponse['display']
}

export interface UserPasswordUpdateRequest {
  currentPassword: string
  newPassword: string
}

export async function getMyProfile(): Promise<UserProfileResponse> {
  const { data } = await api.get<UserProfileResponse>('/users/me/profile')
  return data
}

export async function updateMyProfile(payload: UserProfileUpdateRequest): Promise<UserProfileResponse> {
  const { data } = await api.patch<UserProfileResponse>('/users/me/profile', payload)
  return data
}

export async function getMyPreferences(): Promise<UserPreferencesResponse> {
  const { data } = await api.get<UserPreferencesResponse>('/users/me/preferences')
  return data
}

export async function updateMyPreferences(payload: UserPreferencesUpdateRequest): Promise<UserPreferencesResponse> {
  const { data } = await api.patch<UserPreferencesResponse>('/users/me/preferences', payload)
  return data
}

export async function changeMyPassword(payload: UserPasswordUpdateRequest): Promise<void> {
  await api.patch('/users/me/password', payload)
}
