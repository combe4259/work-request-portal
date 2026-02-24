import { useMutation } from '@tanstack/react-query'
import { login, signup } from './service'

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
