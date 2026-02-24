import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import AuthLayout from '@/components/layout/AuthLayout'
import { useLoginMutation } from '@/features/auth/mutations'
import { useAuthStore } from '@/stores/authStore'

const loginSchema = z.object({
  email: z.string().min(1, '이메일을 입력해주세요').email('올바른 이메일 형식이 아닙니다'),
  password: z.string().min(1, '비밀번호를 입력해주세요'),
})

type LoginFormValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)
  const { setAuth, setCurrentTeam } = useAuthStore()
  const loginMutation = useLoginMutation()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (_data: LoginFormValues) => {
    setServerError(null)
    try {
      const response = await loginMutation.mutateAsync(_data)
      setAuth(response.user, response.accessToken, response.teams)
      if (response.teams.length > 0) {
        setCurrentTeam(response.teams[0])
      }
      navigate('/dashboard', { replace: true })
    } catch (error) {
      setServerError(resolveErrorMessage(error, '이메일 또는 비밀번호가 올바르지 않습니다.'))
    }
  }

  return (
    <AuthLayout>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-1.5">로그인</h2>
        <p className="text-sm text-gray-500">계정 정보를 입력해주세요</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-sm font-medium text-gray-700">
            이메일
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="name@company.com"
            autoComplete="email"
            className={errors.email ? 'border-red-400 focus-visible:ring-red-300' : ''}
            {...register('email')}
          />
          {errors.email && (
            <p className="text-xs text-red-500">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm font-medium text-gray-700">
              비밀번호
            </Label>
            <button type="button" className="text-xs text-brand hover:underline">
              비밀번호 찾기
            </button>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="비밀번호를 입력해주세요"
            autoComplete="current-password"
            className={errors.password ? 'border-red-400 focus-visible:ring-red-300' : ''}
            {...register('password')}
          />
          {errors.password && (
            <p className="text-xs text-red-500">{errors.password.message}</p>
          )}
        </div>

        {serverError && (
          <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2.5">
            <p className="text-xs text-red-600">{serverError}</p>
          </div>
        )}

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-10 bg-brand hover:bg-brand-hover text-white font-semibold text-sm transition-colors"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <SpinnerIcon />
              로그인 중...
            </span>
          ) : (
            '로그인'
          )}
        </Button>
      </form>

      <div className="mt-8 pt-6 border-t border-gray-100">
        <p className="text-xs text-center text-gray-400">
          계정이 없으신가요?&nbsp;
          <button
            type="button"
            onClick={() => navigate('/register')}
            className="text-brand font-medium hover:underline"
          >
            회원가입
          </button>
        </p>
      </div>
    </AuthLayout>
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

function SpinnerIcon() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}
