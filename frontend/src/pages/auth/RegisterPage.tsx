import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import AuthLayout from '@/components/layout/AuthLayout'
import { useLoginMutation, useSignupMutation } from '@/features/auth/mutations'
import { useAuthStore } from '@/stores/authStore'

const registerSchema = z
  .object({
    name: z.string().min(2, '이름은 2자 이상이어야 합니다'),
    email: z.string().min(1, '이메일을 입력해주세요').email('올바른 이메일 형식이 아닙니다'),
    role: z.enum(['PM', 'TEAM_LEAD', 'DEVELOPER', 'REQUESTER'] as const, {
      error: '역할을 선택해주세요',
    }),
    password: z
      .string()
      .min(8, '비밀번호는 8자 이상이어야 합니다')
      .regex(/[A-Za-z]/, '영문자를 포함해야 합니다')
      .regex(/[0-9]/, '숫자를 포함해야 합니다'),
    passwordConfirm: z.string().min(1, '비밀번호 확인을 입력해주세요'),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: '비밀번호가 일치하지 않습니다',
    path: ['passwordConfirm'],
  })

type RegisterFormValues = z.infer<typeof registerSchema>

const ROLE_LABELS: Record<RegisterFormValues['role'], string> = {
  PM: 'PM',
  TEAM_LEAD: '팀장',
  DEVELOPER: '개발자',
  REQUESTER: '요청자',
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)
  const signupMutation = useSignupMutation()
  const loginMutation = useLoginMutation()
  const { setAuth, setCurrentTeam } = useAuthStore()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  })

  const password = watch('password', '')

  const onSubmit = async (_data: RegisterFormValues) => {
    setServerError(null)
    try {
      await signupMutation.mutateAsync({
        name: _data.name,
        email: _data.email,
        role: _data.role,
        password: _data.password,
      })

      const loginResponse = await loginMutation.mutateAsync({
        email: _data.email,
        password: _data.password,
      })

      setAuth(loginResponse.user, loginResponse.accessToken, loginResponse.teams)
      if (loginResponse.teams.length > 0) {
        setCurrentTeam(loginResponse.teams[0])
      }

      navigate('/dashboard', { replace: true })
    } catch (error) {
      setServerError(resolveErrorMessage(error, '회원가입 처리 중 오류가 발생했습니다.'))
    }
  }

  const passwordStrength = getPasswordStrength(password)

  return (
    <AuthLayout>
      <div className="mb-7">
        <h2 className="text-2xl font-bold text-gray-900 mb-1.5">회원가입</h2>
        <p className="text-sm text-gray-500">새 계정을 만들어보세요</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* 이름 */}
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-sm font-medium text-gray-700">
            이름
          </Label>
          <Input
            id="name"
            type="text"
            placeholder="홍길동"
            autoComplete="name"
            className={errors.name ? 'border-red-400 focus-visible:ring-red-300' : ''}
            {...register('name')}
          />
          {errors.name && (
            <p className="text-xs text-red-500">{errors.name.message}</p>
          )}
        </div>

        {/* 이메일 */}
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

        {/* 역할 */}
        <div className="space-y-1.5">
          <Label htmlFor="role" className="text-sm font-medium text-gray-700">
            역할
          </Label>
          <Select onValueChange={(value) => setValue('role', value as RegisterFormValues['role'])}>
            <SelectTrigger
              id="role"
              className={`h-9 text-sm ${errors.role ? 'border-red-400 focus:ring-red-300' : ''}`}
            >
              <SelectValue placeholder="역할을 선택해주세요" />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(ROLE_LABELS) as [RegisterFormValues['role'], string][]).map(
                ([value, label]) => (
                  <SelectItem key={value} value={value} className="text-sm">
                    {label}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
          {errors.role && (
            <p className="text-xs text-red-500">{errors.role.message}</p>
          )}
        </div>

        {/* 비밀번호 */}
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-sm font-medium text-gray-700">
            비밀번호
          </Label>
          <Input
            id="password"
            type="password"
            placeholder="영문 + 숫자 포함 8자 이상"
            autoComplete="new-password"
            className={errors.password ? 'border-red-400 focus-visible:ring-red-300' : ''}
            {...register('password')}
          />
          {/* 비밀번호 강도 */}
          {password.length > 0 && (
            <div className="space-y-1">
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      level <= passwordStrength.score
                        ? passwordStrength.color
                        : 'bg-gray-100'
                    }`}
                  />
                ))}
              </div>
              <p className={`text-xs ${passwordStrength.textColor}`}>
                {passwordStrength.label}
              </p>
            </div>
          )}
          {errors.password && (
            <p className="text-xs text-red-500">{errors.password.message}</p>
          )}
        </div>

        {/* 비밀번호 확인 */}
        <div className="space-y-1.5">
          <Label htmlFor="passwordConfirm" className="text-sm font-medium text-gray-700">
            비밀번호 확인
          </Label>
          <Input
            id="passwordConfirm"
            type="password"
            placeholder="비밀번호를 다시 입력해주세요"
            autoComplete="new-password"
            className={errors.passwordConfirm ? 'border-red-400 focus-visible:ring-red-300' : ''}
            {...register('passwordConfirm')}
          />
          {errors.passwordConfirm && (
            <p className="text-xs text-red-500">{errors.passwordConfirm.message}</p>
          )}
        </div>

        {serverError && (
          <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2.5">
            <p className="text-xs text-red-600">{serverError}</p>
          </div>
        )}

        <div className="pt-1">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-10 bg-brand hover:bg-brand-hover text-white font-semibold text-sm transition-colors"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <SpinnerIcon />
                처리 중...
              </span>
            ) : (
              '가입하기'
            )}
          </Button>
        </div>
      </form>

      <div className="mt-6 pt-5 border-t border-gray-100">
        <p className="text-xs text-center text-gray-400">
          이미 계정이 있으신가요?&nbsp;
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="text-brand font-medium hover:underline"
          >
            로그인
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

function getPasswordStrength(password: string) {
  let score = 0
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 1) return { score: 1, color: 'bg-red-400', textColor: 'text-red-500', label: '취약' }
  if (score === 2) return { score: 2, color: 'bg-orange-400', textColor: 'text-orange-500', label: '보통' }
  if (score === 3) return { score: 3, color: 'bg-blue-400', textColor: 'text-blue-500', label: '강함' }
  return { score: 4, color: 'bg-green-500', textColor: 'text-green-600', label: '매우 강함' }
}

function SpinnerIcon() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}
