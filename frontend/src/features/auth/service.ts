import api from '@/lib/api'
import type { LoginRequest, LoginResponse, SignupRequest, SignupResponse } from '@/types/auth'

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
