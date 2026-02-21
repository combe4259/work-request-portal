import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const loginSchema = z.object({
  email: z.string().min(1, '이메일을 입력해주세요').email('올바른 이메일 형식이 아닙니다'),
  password: z.string().min(1, '비밀번호를 입력해주세요'),
})

type LoginFormValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)

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
      // TODO: API 연동
      // const response = await authApi.login(data)
      // useAuthStore.getState().setAuth(response.user, response.accessToken, response.teams)
      navigate('/dashboard')
    } catch {
      setServerError('이메일 또는 비밀번호가 올바르지 않습니다.')
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-[440px] xl:w-[480px] flex-col justify-between bg-[#1E3A8A] p-10 relative overflow-hidden">
        {/* Background decorative circles */}
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white/5" />
        <div className="absolute top-32 -right-10 w-48 h-48 rounded-full bg-white/[0.04]" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-white/[0.04]" />
        <div className="absolute bottom-24 right-10 w-32 h-32 rounded-full bg-white/[0.06]" />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-9 h-9 bg-white/10 border border-white/20 rounded-lg flex items-center justify-center">
              <PortalIcon />
            </div>
            <span className="text-white/70 text-sm font-medium tracking-wide">IT 업무요청 포털</span>
          </div>

          <h1 className="text-white text-3xl font-bold leading-snug mb-4">
            팀의 업무를<br />한 곳에서 관리하세요
          </h1>
          <p className="text-white/50 text-sm leading-relaxed">
            업무 요청부터 개발, 테스트, 배포까지<br />전체 개발 사이클을 추적합니다.
          </p>
        </div>

        {/* Feature list */}
        <div className="relative z-10 space-y-4">
          {[
            { label: '업무 요청 관리', desc: '접수부터 완료까지 실시간 추적' },
            { label: '개발 사이클', desc: '계획서, 테스트, 배포 이력 관리' },
            { label: '팀 협업', desc: '회의록, 지식 베이스, 공유 리소스' },
          ].map((item) => (
            <div key={item.label} className="flex items-start gap-3">
              <div className="mt-0.5 w-4 h-4 rounded-full border border-white/30 flex items-center justify-center flex-shrink-0">
                <div className="w-1.5 h-1.5 rounded-full bg-[#60A5FA]" />
              </div>
              <div>
                <p className="text-white text-sm font-medium">{item.label}</p>
                <p className="text-white/40 text-xs mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom text */}
        <p className="relative z-10 text-white/25 text-xs">
          © 2026 IT 업무요청 포털
        </p>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-[380px]">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-[#1E3A8A] rounded-lg flex items-center justify-center">
              <PortalIcon className="text-white" />
            </div>
            <span className="text-[#1E3A8A] font-semibold text-sm">IT 업무요청 포털</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-1.5">로그인</h2>
            <p className="text-sm text-gray-500">계정 정보를 입력해주세요</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                이메일
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="name@company.com"
                autoComplete="email"
                className={`h-10 text-sm ${errors.email ? 'border-red-400 focus-visible:ring-red-300' : ''}`}
                {...register('email')}
              />
              {errors.email && (
                <p className="text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  비밀번호
                </Label>
                <button
                  type="button"
                  className="text-xs text-[#1D4ED8] hover:underline"
                >
                  비밀번호 찾기
                </button>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="비밀번호를 입력해주세요"
                autoComplete="current-password"
                className={`h-10 text-sm ${errors.password ? 'border-red-400 focus-visible:ring-red-300' : ''}`}
                {...register('password')}
              />
              {errors.password && (
                <p className="text-xs text-red-500">{errors.password.message}</p>
              )}
            </div>

            {/* Server error */}
            {serverError && (
              <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2.5">
                <p className="text-xs text-red-600">{serverError}</p>
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-10 bg-[#1D4ED8] hover:bg-[#1E40AF] text-white font-semibold text-sm transition-colors"
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
                className="text-[#1D4ED8] font-medium hover:underline"
              >
                회원가입
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function PortalIcon({ className = 'text-white' }: { className?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect x="2" y="4" width="11" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <rect x="5" y="2" width="11" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.4" strokeOpacity="0.5" />
      <line x1="5" y1="8" x2="10" y2="8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="5" y1="11" x2="10" y2="11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg
      className="animate-spin h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}
