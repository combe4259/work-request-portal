import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ProfileRole = 'PM' | 'CTO' | '개발자' | '디자이너' | 'QA' | '기획자'

export const AVATAR_COLOR_HEX: Record<string, string> = {
  brand:   '#0046ff',
  indigo:  '#6366F1',
  violet:  '#8B5CF6',
  emerald: '#10B981',
  amber:   '#F59E0B',
  rose:    '#F43F5E',
  slate:   '#64748B',
}

interface ProfileState {
  displayName: string
  email: string
  role: ProfileRole
  avatarColor: string        // key of AVATAR_COLOR_HEX
  photoUrl: string | null    // base64 data URL
  updateProfile: (patch: Partial<Omit<ProfileState, 'updateProfile'>>) => void
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      displayName: '',
      email: '',
      role: '개발자',
      avatarColor: 'brand',
      photoUrl: null,
      updateProfile: (patch) => set((s) => ({ ...s, ...patch })),
    }),
    {
      name: 'profile-storage',
      version: 2,
      migrate: (persistedState, version) => {
        const state = persistedState as Partial<ProfileState> | undefined
        if (!state) {
          return state
        }
        if (
          version < 2 &&
          state.displayName === '김개발' &&
          state.email === 'kim.dev@shinhan.com'
        ) {
          return {
            ...state,
            displayName: '',
            email: '',
          }
        }
        return state
      },
    }
  )
)
