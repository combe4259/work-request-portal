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
import { useCreateTeamMutation, useJoinTeamMutation } from '@/features/auth/mutations'
import { useAuthStore } from '@/stores/authStore'
import type { Team } from '@/types/auth'

type Mode = 'create' | 'join' | null

// ── 스키마 ──────────────────────────────────────────
const createTeamSchema = z.object({
  name: z
    .string()
    .min(2, '팀 이름은 2자 이상이어야 합니다')
    .max(50, '팀 이름은 50자 이하이어야 합니다'),
  description: z.string().max(200, '설명은 200자 이하이어야 합니다').optional(),
})

const joinTeamSchema = z.object({
  inviteCode: z
    .string()
    .min(1, '초대 코드를 입력해주세요')
    .min(4, '올바른 초대 코드를 입력해주세요'),
})

type CreateTeamValues = z.infer<typeof createTeamSchema>
type JoinTeamValues = z.infer<typeof joinTeamSchema>

// ── 컴포넌트 ─────────────────────────────────────────
export default function TeamSelectPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>(null)
  const { teams, addTeam, setCurrentTeam } = useAuthStore()

  const handleSuccess = (team: Team) => {
    addTeam(team)
    navigate('/dashboard', { replace: true })
  }

  const handleSelectExistingTeam = (team: Team) => {
    setCurrentTeam(team)
    navigate('/dashboard', { replace: true })
  }

  return (
    <AuthLayout>
      <div className="mb-7">
        <h2 className="text-2xl font-bold text-gray-900 mb-1.5">팀 설정</h2>
        <p className="text-sm text-gray-500">입장할 팀을 먼저 선택하세요</p>
      </div>

      {teams.length > 0 && (
        <div className="mb-5 bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm font-semibold text-gray-800 mb-3">내 팀 선택</p>
          <div className="space-y-2">
            {teams.map((team) => (
              <button
                key={team.id}
                type="button"
                onClick={() => handleSelectExistingTeam(team)}
                className="w-full text-left rounded-lg border border-gray-200 px-3 py-2.5 hover:border-brand/40 hover:bg-brand/5 transition-colors"
              >
                <p className="text-sm font-semibold text-gray-900">{team.name}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{team.teamRole}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 옵션 카드 */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <OptionCard
          active={mode === 'create'}
          onClick={() => setMode(mode === 'create' ? null : 'create')}
          icon={<CreateTeamIcon active={mode === 'create'} />}
          title="팀 만들기"
          desc="새로운 팀을 생성합니다"
        />
        <OptionCard
          active={mode === 'join'}
          onClick={() => setMode(mode === 'join' ? null : 'join')}
          icon={<JoinTeamIcon active={mode === 'join'} />}
          title="팀 참여하기"
          desc="초대 코드로 팀에 합류합니다"
        />
      </div>

      {/* 인라인 폼 */}
      {mode === 'create' && (
        <CreateTeamForm onSuccess={handleSuccess} />
      )}
      {mode === 'join' && (
        <JoinTeamForm onSuccess={handleSuccess} />
      )}

      <div className="mt-6 pt-5 border-t border-gray-100">
        <p className="text-xs text-center text-gray-400">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="text-brand font-medium hover:underline"
          >
            로그인 화면으로 돌아가기
          </button>
        </p>
      </div>
    </AuthLayout>
  )
}

// ── 옵션 카드 ─────────────────────────────────────────
interface OptionCardProps {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  title: string
  desc: string
}

function OptionCard({ active, onClick, icon, title, desc }: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        flex flex-col items-center text-center p-4 rounded-xl border-2 transition-all
        ${active
          ? 'border-brand bg-brand/5'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
        }
      `}
    >
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2.5 transition-colors ${
          active ? 'bg-brand/10' : 'bg-gray-100'
        }`}
      >
        {icon}
      </div>
      <p className={`text-sm font-semibold mb-0.5 ${active ? 'text-brand' : 'text-gray-800'}`}>
        {title}
      </p>
      <p className="text-[11px] text-gray-400 leading-tight">{desc}</p>
    </button>
  )
}

// ── 팀 만들기 폼 ──────────────────────────────────────
function CreateTeamForm({ onSuccess }: { onSuccess: (team: Team) => void }) {
  const [serverError, setServerError] = useState<string | null>(null)
  const createTeamMutation = useCreateTeamMutation()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateTeamValues>({ resolver: zodResolver(createTeamSchema) })

  const onSubmit = async (data: CreateTeamValues) => {
    setServerError(null)
    try {
      const team = await createTeamMutation.mutateAsync({
        name: data.name,
        description: data.description?.trim() ? data.description.trim() : undefined,
      })
      onSuccess(team)
    } catch (error) {
      setServerError(resolveErrorMessage(error, '팀 생성 중 오류가 발생했습니다.'))
    }
  }

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
      <p className="text-sm font-semibold text-gray-800 mb-4">팀 정보 입력</p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="teamName" className="text-xs font-medium text-gray-600">
            팀 이름 <span className="text-red-400">*</span>
          </Label>
          <Input
            id="teamName"
            placeholder="예: 플랫폼개발부"
            className={`h-9 text-sm bg-white ${errors.name ? 'border-red-400' : ''}`}
            {...register('name')}
          />
          {errors.name && (
            <p className="text-xs text-red-500">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="teamDesc" className="text-xs font-medium text-gray-600">
            팀 설명
            <span className="ml-1 text-gray-400 font-normal">(선택)</span>
          </Label>
          <Input
            id="teamDesc"
            placeholder="팀에 대해 간략히 설명해주세요"
            className="h-9 text-sm bg-white"
            {...register('description')}
          />
          {errors.description && (
            <p className="text-xs text-red-500">{errors.description.message}</p>
          )}
        </div>

        {serverError && (
          <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2.5">
            <p className="text-xs text-red-600">{serverError}</p>
          </div>
        )}

        <Button
          type="submit"
          disabled={isSubmitting || createTeamMutation.isPending}
          className="w-full h-9 bg-brand hover:bg-brand-hover text-white text-sm font-semibold transition-colors"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <SpinnerIcon />
              생성 중...
            </span>
          ) : (
            '팀 생성하기'
          )}
        </Button>
      </form>
    </div>
  )
}

// ── 팀 참여 폼 ────────────────────────────────────────
function JoinTeamForm({ onSuccess }: { onSuccess: (team: Team) => void }) {
  const [serverError, setServerError] = useState<string | null>(null)
  const joinTeamMutation = useJoinTeamMutation()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<JoinTeamValues>({ resolver: zodResolver(joinTeamSchema) })

  const onSubmit = async (data: JoinTeamValues) => {
    setServerError(null)
    try {
      const team = await joinTeamMutation.mutateAsync({
        inviteCode: data.inviteCode.trim().toUpperCase(),
      })
      onSuccess(team)
    } catch (error) {
      setServerError(resolveErrorMessage(error, '팀 참여 중 오류가 발생했습니다.'))
    }
  }

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
      <p className="text-sm font-semibold text-gray-800 mb-1">초대 코드 입력</p>
      <p className="text-xs text-gray-400 mb-4">팀 관리자에게 초대 코드를 받아 입력해주세요</p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="inviteCode" className="text-xs font-medium text-gray-600">
            초대 코드 <span className="text-red-400">*</span>
          </Label>
          <Input
            id="inviteCode"
            placeholder="초대 코드를 입력해주세요"
            autoComplete="off"
            spellCheck={false}
            className={`h-9 text-sm bg-white tracking-widest font-mono uppercase ${
              errors.inviteCode ? 'border-red-400' : ''
            }`}
            {...register('inviteCode', {
              onChange: (e) => {
                e.target.value = e.target.value.toUpperCase()
              },
            })}
          />
          {errors.inviteCode && (
            <p className="text-xs text-red-500">{errors.inviteCode.message}</p>
          )}
        </div>

        {serverError && (
          <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2.5">
            <p className="text-xs text-red-600">{serverError}</p>
          </div>
        )}

        <Button
          type="submit"
          disabled={isSubmitting || joinTeamMutation.isPending}
          className="w-full h-9 bg-brand hover:bg-brand-hover text-white text-sm font-semibold transition-colors"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <SpinnerIcon />
              확인 중...
            </span>
          ) : (
            '팀 참여하기'
          )}
        </Button>
      </form>
    </div>
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

// ── SVG 아이콘 ────────────────────────────────────────
function CreateTeamIcon({ active }: { active: boolean }) {
  const color = active ? '#0046ff' : '#9CA3AF'
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="7.5" cy="6.5" r="2.5" stroke={color} strokeWidth="1.5" />
      <path d="M2 15.5C2 13.015 4.515 11 7.5 11" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="14" cy="13" r="1" fill={color} />
      <line x1="14" y1="10" x2="14" y2="16" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="11" y1="13" x2="17" y2="13" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function JoinTeamIcon({ active }: { active: boolean }) {
  const color = active ? '#0046ff' : '#9CA3AF'
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="7" cy="6.5" r="2.5" stroke={color} strokeWidth="1.5" />
      <path d="M2 15.5C2 13.015 4.515 11 7 11C8.12 11 9.16 11.32 10 11.87" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 15L15 15M15 15L13 13M15 15L13 17" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="11" y="11" width="7" height="8" rx="1.5" stroke={color} strokeWidth="1.5" />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}
