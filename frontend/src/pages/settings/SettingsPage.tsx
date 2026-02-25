import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useProfileStore, AVATAR_COLOR_HEX } from '@/stores/profileStore'
import { useAuthStore } from '@/stores/authStore'
import {
  changeMyPassword,
  getMyPreferences,
  getMyProfile,
  updateMyPreferences,
  updateMyProfile,
  type SettingsRole,
  type UserPreferencesResponse,
} from '@/features/settings/service'

// ── 탭 정의 ───────────────────────────────────────────
type TabKey = 'profile' | 'notification' | 'security' | 'display'

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'profile',      label: '내 프로필',  icon: <ProfileIcon /> },
  { key: 'notification', label: '알림 설정',  icon: <BellIcon /> },
  { key: 'security',     label: '보안',       icon: <LockIcon /> },
  { key: 'display',      label: '화면 설정',  icon: <DisplayIcon /> },
]

// ── 프로필 스키마 ─────────────────────────────────────
const ROLES = ['PM', 'CTO', '개발자', '디자이너', 'QA', '기획자'] as const
type Role = typeof ROLES[number]
const ROLE_SET = new Set<Role>(ROLES)

const profileSchema = z.object({
  name:  z.string().min(1, '이름을 입력해주세요'),
  email: z.string().email('올바른 이메일 형식이 아닙니다'),
  role:  z.enum(ROLES, { error: '역할을 선택해주세요' }),
})
type ProfileForm = z.infer<typeof profileSchema>

const ROLE_STYLES: Record<Role, { active: string; inactive: string }> = {
  PM:     { active: 'bg-blue-500 text-white border-blue-500',    inactive: 'bg-blue-50 text-blue-600 border-blue-100 hover:border-blue-300' },
  CTO:    { active: 'bg-violet-500 text-white border-violet-500', inactive: 'bg-violet-50 text-violet-600 border-violet-100 hover:border-violet-300' },
  개발자: { active: 'bg-emerald-500 text-white border-emerald-500', inactive: 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:border-emerald-300' },
  디자이너: { active: 'bg-pink-500 text-white border-pink-500',  inactive: 'bg-pink-50 text-pink-600 border-pink-100 hover:border-pink-300' },
  QA:     { active: 'bg-orange-500 text-white border-orange-500', inactive: 'bg-orange-50 text-orange-600 border-orange-100 hover:border-orange-300' },
  기획자: { active: 'bg-amber-500 text-white border-amber-500',  inactive: 'bg-amber-50 text-amber-700 border-amber-100 hover:border-amber-300' },
}

// ── 비밀번호 스키마 ───────────────────────────────────
const pwSchema = z.object({
  current:  z.string().min(1, '현재 비밀번호를 입력해주세요'),
  next:     z.string().min(8, '비밀번호는 8자 이상이어야 합니다'),
  confirm:  z.string().min(1, '비밀번호 확인을 입력해주세요'),
}).refine((d) => d.next === d.confirm, { message: '비밀번호가 일치하지 않습니다', path: ['confirm'] })
type PwForm = z.infer<typeof pwSchema>

// ── 아바타 컬러 팔레트 ────────────────────────────────
const AVATAR_COLORS = [
  { id: 'brand',   bg: 'bg-brand',       ring: 'ring-brand' },
  { id: 'indigo',  bg: 'bg-indigo-500',  ring: 'ring-indigo-500' },
  { id: 'violet',  bg: 'bg-violet-500',  ring: 'ring-violet-500' },
  { id: 'emerald', bg: 'bg-emerald-500', ring: 'ring-emerald-500' },
  { id: 'amber',   bg: 'bg-amber-500',   ring: 'ring-amber-500' },
  { id: 'rose',    bg: 'bg-rose-500',    ring: 'ring-rose-500' },
  { id: 'slate',   bg: 'bg-slate-500',   ring: 'ring-slate-500' },
]

// ── 알림 항목 ─────────────────────────────────────────
const NOTIF_ITEMS = [
  { key: 'assign',   label: '업무 배정',    desc: '나에게 업무가 배정되면 알림' },
  { key: 'comment',  label: '댓글',         desc: '내 업무에 댓글이 달리면 알림' },
  { key: 'deadline', label: '마감 임박',    desc: '마감 3일 전부터 알림' },
  { key: 'status',   label: '상태 변경',    desc: '담당 업무의 상태가 변경되면 알림' },
  { key: 'deploy',   label: '배포 완료',    desc: '연관 배포가 완료되면 알림' },
  { key: 'mention',  label: '멘션',         desc: '댓글에서 @멘션 되면 알림' },
] as const satisfies ReadonlyArray<{ key: keyof UserPreferencesResponse['notification']; label: string; desc: string }>

// ── 화면 설정 옵션 ────────────────────────────────────
const LANDING_OPTIONS = [
  { value: '/dashboard',    label: '대시보드' },
  { value: '/work-requests', label: '업무요청' },
  { value: '/tech-tasks',   label: '기술과제' },
] as const satisfies ReadonlyArray<{ value: UserPreferencesResponse['display']['landing']; label: string }>
const ROW_OPTIONS = [10, 20, 50] as const satisfies ReadonlyArray<UserPreferencesResponse['display']['rowCount']>

// ── 공통 스타일 헬퍼 ──────────────────────────────────
const inputCls = (hasError: boolean) =>
  `w-full h-9 px-3 text-[13px] border rounded-lg focus:outline-none focus:ring-1 transition-colors ${
    hasError ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : 'border-gray-200 focus:border-brand focus:ring-brand/20'
  }`

function FormField({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[12px] font-semibold text-gray-600 block">
        {label}{required && <span className="ml-1 text-red-400">*</span>}
      </label>
      {children}
      {error && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  )
}

// ── 토글 스위치 ───────────────────────────────────────
function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${on ? 'bg-brand' : 'bg-gray-200'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${on ? 'translate-x-4' : ''}`} />
    </button>
  )
}

// ── 저장 완료 토스트 ──────────────────────────────────
function SaveToast({ visible, message, isError }: { visible: boolean; message: string; isError: boolean }) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 text-white text-[12px] font-medium px-4 py-2.5 rounded-xl shadow-lg transition-all duration-300 ${
      isError ? 'bg-red-600' : 'bg-gray-900'
    } ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`}>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="6" fill={isError ? '#F87171' : '#22C55E'} />
        <path d={isError ? 'M4.6 4.6l4.8 4.8M9.4 4.6L4.6 9.4' : 'M4 7l2.5 2.5L10 5'} stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {message}
    </div>
  )
}

function normalizeRole(value: string | null | undefined): Role {
  if (!value) {
    return '개발자'
  }
  return ROLE_SET.has(value as Role) ? (value as Role) : '개발자'
}

function resolveErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null) {
    const responseMessage = (error as { response?: { data?: { message?: unknown } } }).response?.data?.message
    if (typeof responseMessage === 'string' && responseMessage.trim().length > 0) {
      return responseMessage
    }
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message
  }

  return fallback
}

// ── 메인 ─────────────────────────────────────────────
export default function SettingsPage() {
  const { displayName, email, role, avatarColor, photoUrl, updateProfile } = useProfileStore()
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState<TabKey>('profile')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const toastTimerRef = useRef<number | null>(null)
  const [notifs, setNotifs] = useState<UserPreferencesResponse['notification']>({
    assign: true, comment: true, deadline: true, status: false, deploy: true, mention: false,
  })
  const [landing, setLanding] = useState<UserPreferencesResponse['display']['landing']>('/dashboard')
  const [rowCount, setRowCount] = useState<UserPreferencesResponse['display']['rowCount']>(20)
  const [toast, setToast] = useState({ visible: false, message: '저장되었습니다', isError: false })
  const [isLoading, setIsLoading] = useState(true)
  const [isProfileSaving, setIsProfileSaving] = useState(false)
  const [isPreferencesSaving, setIsPreferencesSaving] = useState(false)
  const [isPasswordSaving, setIsPasswordSaving] = useState(false)
  const effectiveDisplayName = displayName || user?.name || ''
  const effectiveEmail = email || user?.email || ''

  const showToast = (message = '저장되었습니다', isError = false) => {
    setToast({ visible: true, message, isError })
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current)
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }))
    }, 2200)
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      showToast('이미지 파일만 업로드할 수 있습니다.', true)
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('프로필 사진은 5MB 이하만 업로드할 수 있습니다.', true)
      return
    }

    const reader = new FileReader()
    reader.onload = (ev) => updateProfile({ photoUrl: ev.target?.result as string })
    reader.readAsDataURL(file)
  }

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: effectiveDisplayName, email: effectiveEmail, role: normalizeRole(role) },
  })
  const { reset: resetProfileForm } = profileForm

  const pwForm = useForm<PwForm>({
    resolver: zodResolver(pwSchema),
    defaultValues: { current: '', next: '', confirm: '' },
  })

  const onProfileSave = async (data: ProfileForm) => {
    setIsProfileSaving(true)
    try {
      const response = await updateMyProfile({
        name: data.name,
        email: data.email,
        role: data.role as SettingsRole,
        avatarColor,
        photoUrl,
      })

      const normalizedRole = normalizeRole(response.role)
      updateProfile({
        displayName: response.name,
        email: response.email,
        role: normalizedRole,
        avatarColor: response.avatarColor,
        photoUrl: response.photoUrl,
      })
      resetProfileForm({
        name: response.name,
        email: response.email,
        role: normalizedRole,
      })
      showToast('프로필이 저장되었습니다.')
    } catch (error) {
      showToast(resolveErrorMessage(error, '프로필 저장에 실패했습니다.'), true)
    } finally {
      setIsProfileSaving(false)
    }
  }

  const savePreferences = async () => {
    setIsPreferencesSaving(true)
    try {
      const response = await updateMyPreferences({
        notification: notifs,
        display: {
          landing,
          rowCount,
        },
      })
      setNotifs(response.notification)
      setLanding(response.display.landing)
      setRowCount(response.display.rowCount)
      showToast('환경설정이 저장되었습니다.')
    } catch (error) {
      showToast(resolveErrorMessage(error, '환경설정 저장에 실패했습니다.'), true)
    } finally {
      setIsPreferencesSaving(false)
    }
  }

  const onPwSave = async (data: PwForm) => {
    setIsPasswordSaving(true)
    try {
      await changeMyPassword({
        currentPassword: data.current,
        newPassword: data.next,
      })
      pwForm.reset()
      showToast('비밀번호가 변경되었습니다.')
    } catch (error) {
      showToast(resolveErrorMessage(error, '비밀번호 변경에 실패했습니다.'), true)
    } finally {
      setIsPasswordSaving(false)
    }
  }

  useEffect(() => {
    let mounted = true

    const loadSettings = async () => {
      setIsLoading(true)
      try {
        const [profileResponse, preferencesResponse] = await Promise.all([
          getMyProfile(),
          getMyPreferences(),
        ])

        if (!mounted) {
          return
        }

        const normalizedRole = normalizeRole(profileResponse.role)
        updateProfile({
          displayName: profileResponse.name,
          email: profileResponse.email,
          role: normalizedRole,
          avatarColor: profileResponse.avatarColor,
          photoUrl: profileResponse.photoUrl,
        })
        resetProfileForm({
          name: profileResponse.name,
          email: profileResponse.email,
          role: normalizedRole,
        })

        setNotifs(preferencesResponse.notification)
        setLanding(preferencesResponse.display.landing)
        setRowCount(preferencesResponse.display.rowCount)
      } catch (error) {
        if (mounted) {
          showToast(resolveErrorMessage(error, '설정 정보를 불러오지 못했습니다.'), true)
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    void loadSettings()

    return () => {
      mounted = false
    }
  }, [resetProfileForm, updateProfile])

  useEffect(() => {
    resetProfileForm({
      name: effectiveDisplayName,
      email: effectiveEmail,
      role: normalizeRole(role),
    })
  }, [effectiveDisplayName, effectiveEmail, role, resetProfileForm])

  useEffect(() => () => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current)
    }
  }, [])

  const selectedColorHex = AVATAR_COLOR_HEX[avatarColor] ?? AVATAR_COLOR_HEX['brand']

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="text-sm text-gray-500">설정 정보를 불러오는 중입니다...</div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-5">
        <h1 className="text-[22px] font-bold text-gray-900">설정</h1>
        <p className="text-[12px] text-gray-400 mt-0.5">계정 및 시스템 환경 설정</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-5 items-start">
        {/* 좌측 탭 네비 */}
        <div className="w-full lg:w-[180px] flex-shrink-0 bg-white rounded-xl border border-blue-50 shadow-[0_2px_8px_rgba(30,58,138,0.05)] p-2 overflow-x-auto">
          <div className="flex lg:block gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`shrink-0 lg:w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors text-[13px] font-medium ${
                activeTab === tab.key
                  ? 'bg-brand/8 text-brand'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              }`}
            >
              <span className={activeTab === tab.key ? 'text-brand' : 'text-gray-400'}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
          </div>
        </div>

        {/* 우측 콘텐츠 */}
        <div className="flex-1 min-w-0">

          {/* ── 내 프로필 ─────────────────────────────── */}
          {activeTab === 'profile' && (
            <form onSubmit={profileForm.handleSubmit(onProfileSave)} noValidate>
              <div className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_8px_rgba(30,58,138,0.05)] p-6 space-y-5">
                <p className="text-[13px] font-semibold text-gray-800 pb-1 border-b border-gray-100">기본 정보</p>

                {/* 프로필 사진 + 아바타 색상 */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                  {/* 사진 영역 */}
                  <div className="relative flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center group focus:outline-none"
                      title="프로필 사진 변경"
                    >
                      {photoUrl ? (
                        <img src={photoUrl} alt="프로필" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white text-[24px] font-bold" style={{ backgroundColor: selectedColorHex }}>
                          {profileForm.watch('name')?.[0] ?? 'K'}
                        </div>
                      )}
                      {/* 호버 오버레이 */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl">
                        <CameraIcon />
                      </div>
                    </button>
                    {photoUrl && (
                      <button
                        type="button"
                        onClick={() => { updateProfile({ photoUrl: null }); if (fileInputRef.current) fileInputRef.current.value = '' }}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                        title="사진 삭제"
                      >
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 1l6 6M7 1L1 7" stroke="white" strokeWidth="1.3" strokeLinecap="round" /></svg>
                      </button>
                    )}
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                  </div>

                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold text-gray-500">
                      프로필 사진 <span className="font-normal text-gray-400">· JPG, PNG (최대 5MB)</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-7 px-3 text-[11px] font-medium border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                    >
                      사진 변경
                    </button>
                    {!photoUrl && (
                      <div>
                        <p className="text-[10px] text-gray-400 mb-1.5">아바타 색상</p>
                        <div className="flex gap-1.5">
                          {AVATAR_COLORS.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => updateProfile({ avatarColor: c.id })}
                              className={`w-5 h-5 rounded-full transition-all ${avatarColor === c.id ? 'ring-2 ring-offset-1 ring-gray-400 opacity-100' : 'opacity-40 hover:opacity-70'}`}
                              style={{ backgroundColor: AVATAR_COLOR_HEX[c.id] }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 이름 · 이메일 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="이름" required error={profileForm.formState.errors.name?.message}>
                    <input {...profileForm.register('name')} className={inputCls(!!profileForm.formState.errors.name)} />
                  </FormField>
                  <FormField label="이메일" required error={profileForm.formState.errors.email?.message}>
                    <input {...profileForm.register('email')} type="email" className={inputCls(!!profileForm.formState.errors.email)} />
                  </FormField>
                </div>

                {/* 역할 */}
                <FormField label="역할" required error={profileForm.formState.errors.role?.message}>
                  <div className="flex flex-wrap gap-2">
                    {ROLES.map((r) => (
                      <label key={r} className="cursor-pointer">
                        <input type="radio" {...profileForm.register('role')} value={r} className="sr-only" />
                        <span className={`inline-block px-3 py-1.5 rounded-lg border text-[12px] font-medium transition-colors ${
                          profileForm.watch('role') === r ? ROLE_STYLES[r].active : ROLE_STYLES[r].inactive
                        }`}>
                          {r}
                        </span>
                      </label>
                    ))}
                  </div>
                </FormField>
              </div>

              <div className="flex justify-end mt-4">
                <button
                  type="submit"
                  disabled={isProfileSaving}
                  className="h-9 px-5 text-[13px] font-semibold text-white bg-brand hover:bg-brand-hover disabled:opacity-60 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  {isProfileSaving ? '저장 중...' : '저장'}
                </button>
              </div>
            </form>
          )}

          {/* ── 알림 설정 ─────────────────────────────── */}
          {activeTab === 'notification' && (
            <div className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_8px_rgba(30,58,138,0.05)] p-6">
              <p className="text-[13px] font-semibold text-gray-800 pb-1 border-b border-gray-100 mb-5">알림 채널</p>

              <div className="divide-y divide-gray-50">
                {NOTIF_ITEMS.map((item) => (
                  <div key={item.key} className="flex items-center justify-between py-4">
                    <div>
                      <p className="text-[13px] font-medium text-gray-800">{item.label}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{item.desc}</p>
                    </div>
                    <Toggle on={notifs[item.key]} onChange={(v) => setNotifs((prev) => ({ ...prev, [item.key]: v }))} />
                  </div>
                ))}
              </div>

              <div className="flex justify-end mt-4">
                <button
                  type="button"
                  disabled={isPreferencesSaving}
                  onClick={() => void savePreferences()}
                  className="h-9 px-5 text-[13px] font-semibold text-white bg-brand hover:bg-brand-hover disabled:opacity-60 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  {isPreferencesSaving ? '저장 중...' : '저장'}
                </button>
              </div>
            </div>
          )}

          {/* ── 보안 ──────────────────────────────────── */}
          {activeTab === 'security' && (
            <form onSubmit={pwForm.handleSubmit(onPwSave)} noValidate>
              <div className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_8px_rgba(30,58,138,0.05)] p-6 space-y-5">
                <p className="text-[13px] font-semibold text-gray-800 pb-1 border-b border-gray-100">비밀번호 변경</p>

                <FormField label="현재 비밀번호" required error={pwForm.formState.errors.current?.message}>
                  <input {...pwForm.register('current')} type="password" placeholder="현재 비밀번호 입력" className={inputCls(!!pwForm.formState.errors.current)} />
                </FormField>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="새 비밀번호" required error={pwForm.formState.errors.next?.message}>
                    <input {...pwForm.register('next')} type="password" placeholder="8자 이상" className={inputCls(!!pwForm.formState.errors.next)} />
                  </FormField>
                  <FormField label="새 비밀번호 확인" required error={pwForm.formState.errors.confirm?.message}>
                    <input {...pwForm.register('confirm')} type="password" placeholder="비밀번호 재입력" className={inputCls(!!pwForm.formState.errors.confirm)} />
                  </FormField>
                </div>

                <div className="bg-gray-50 rounded-lg px-4 py-3 space-y-1">
                  {['영문 대소문자 포함', '숫자 1개 이상 포함', '8자 이상'].map((rule) => (
                    <div key={rule} className="flex items-center gap-2 text-[11px] text-gray-400">
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1" /><path d="M3 5l1.5 1.5L7 3.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      {rule}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end mt-4">
                <button
                  type="submit"
                  disabled={isPasswordSaving}
                  className="h-9 px-5 text-[13px] font-semibold text-white bg-brand hover:bg-brand-hover disabled:opacity-60 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  {isPasswordSaving ? '변경 중...' : '비밀번호 변경'}
                </button>
              </div>
            </form>
          )}

          {/* ── 화면 설정 ─────────────────────────────── */}
          {activeTab === 'display' && (
            <div className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_8px_rgba(30,58,138,0.05)] p-6 space-y-6">
              <p className="text-[13px] font-semibold text-gray-800 pb-1 border-b border-gray-100">화면 환경</p>

              {/* 기본 랜딩 페이지 */}
              <div className="space-y-2">
                <label className="text-[12px] font-semibold text-gray-600 block">로그인 후 기본 페이지</label>
                <div className="flex gap-2">
                  {LANDING_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setLanding(opt.value)}
                      className={`h-8 px-4 rounded-lg border text-[12px] font-medium transition-colors ${
                        landing === opt.value
                          ? 'bg-brand text-white border-brand'
                          : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 테이블 기본 표시 건수 */}
              <div className="space-y-2">
                <label className="text-[12px] font-semibold text-gray-600 block">테이블 기본 표시 건수</label>
                <div className="flex gap-2">
                  {ROW_OPTIONS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRowCount(n)}
                      className={`w-14 h-8 rounded-lg border text-[12px] font-medium transition-colors ${
                        rowCount === n
                          ? 'bg-brand text-white border-brand'
                          : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {n}건
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  disabled={isPreferencesSaving}
                  onClick={() => void savePreferences()}
                  className="h-9 px-5 text-[13px] font-semibold text-white bg-brand hover:bg-brand-hover disabled:opacity-60 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  {isPreferencesSaving ? '저장 중...' : '저장'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      <SaveToast visible={toast.visible} message={toast.message} isError={toast.isError} />
    </div>
  )
}

// ── 탭 아이콘 ─────────────────────────────────────────
function ProfileIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><circle cx="7" cy="4.5" r="2.5" stroke="currentColor" strokeWidth="1.2" /><path d="M2 12c0-2.21 2.24-4 5-4s5 1.79 5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
}
function BellIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M7 1.5A4.5 4.5 0 002.5 6v3L1.5 10.5h11L11.5 9V6A4.5 4.5 0 007 1.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /><path d="M5.5 10.5a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.2" /></svg>
}
function LockIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><rect x="2.5" y="6" width="9" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.2" /><path d="M4.5 6V4.5a2.5 2.5 0 015 0V6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /><circle cx="7" cy="9" r="1" fill="currentColor" /></svg>
}
function DisplayIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><rect x="1.5" y="2" width="11" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" /><path d="M5 12h4M7 10v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
}

function CameraIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M6.5 3.5L5 5.5H2.5a1 1 0 00-1 1v8a1 1 0 001 1h13a1 1 0 001-1v-8a1 1 0 00-1-1H13l-1.5-2h-5z" stroke="white" strokeWidth="1.2" strokeLinejoin="round" />
      <circle cx="9" cy="10" r="2.5" stroke="white" strokeWidth="1.2" />
    </svg>
  )
}
