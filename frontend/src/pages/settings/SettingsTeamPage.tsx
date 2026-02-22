import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

// ── Mock 데이터 ────────────────────────────────────────
interface TeamMember {
  id: string
  name: string
  email: string
  role: string
}

const INITIAL_MEMBERS: TeamMember[] = [
  { id: '1', name: '박PM',     email: 'park.pm@shinhan.com',     role: 'PM' },
  { id: '2', name: '김개발',   email: 'kim.dev@shinhan.com',     role: '개발자' },
  { id: '3', name: '이테스터', email: 'lee.qa@shinhan.com',      role: 'QA' },
  { id: '4', name: '최설계',   email: 'choi.design@shinhan.com', role: '디자이너' },
  { id: '5', name: '박디자인', email: 'park.ux@shinhan.com',     role: '디자이너' },
  { id: '6', name: '이개발',   email: 'lee.dev@shinhan.com',     role: '개발자' },
  { id: '7', name: '박신입',   email: 'park.new@shinhan.com',    role: '개발자' },
]

const ROLE_BADGE: Record<string, string> = {
  PM:     'bg-blue-50 text-blue-600 border border-blue-100',
  CTO:    'bg-violet-50 text-violet-600 border border-violet-100',
  개발자: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
  디자이너: 'bg-pink-50 text-pink-600 border border-pink-100',
  QA:     'bg-amber-50 text-amber-600 border border-amber-100',
  기획자: 'bg-indigo-50 text-indigo-600 border border-indigo-100',
}

export default function SettingsTeamPage() {
  const navigate = useNavigate()
  const [members, setMembers] = useState<TeamMember[]>(INITIAL_MEMBERS)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const handleRemove = (id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id))
    setConfirmId(null)
  }

  return (
    <div className="p-6 max-w-[800px] mx-auto">

      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
          aria-label="뒤로 가기"
        >
          <BackIcon />
        </button>
        <div>
          <h1 className="text-[20px] font-bold text-gray-900">팀 관리</h1>
          <p className="text-[12px] text-gray-400 mt-0.5">총 {members.length}명</p>
        </div>
      </div>

      {/* 멤버 목록 */}
      <div className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_12px_rgba(30,58,138,0.07)] overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50/70 border-b border-gray-100">
            <tr>
              <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 tracking-wide">이름</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 tracking-wide">이메일</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 tracking-wide">역할</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-12 text-center text-[13px] text-gray-400">
                  팀 멤버가 없습니다.
                </td>
              </tr>
            ) : members.map((m) => (
              <tr key={m.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                {/* 이름 + 아바타 */}
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
                      style={{ backgroundColor: stringToColor(m.name) }}
                    >
                      {m.name[0]}
                    </div>
                    <span className="text-[13px] font-medium text-gray-800">{m.name}</span>
                  </div>
                </td>

                {/* 이메일 */}
                <td className="px-4 py-3">
                  <span className="text-[12px] text-gray-500">{m.email}</span>
                </td>

                {/* 역할 */}
                <td className="px-4 py-3">
                  <span className={`inline-flex text-[11px] font-medium px-2 py-0.5 rounded-full ${ROLE_BADGE[m.role] ?? 'bg-gray-100 text-gray-500'}`}>
                    {m.role}
                  </span>
                </td>

                {/* 제거 */}
                <td className="px-4 py-3 text-right">
                  {confirmId === m.id ? (
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-[11px] text-gray-500">제거할까요?</span>
                      <button
                        onClick={() => handleRemove(m.id)}
                        className="h-6 px-2.5 text-[11px] font-semibold text-white bg-red-500 hover:bg-red-600 rounded-md transition-colors"
                      >
                        확인
                      </button>
                      <button
                        onClick={() => setConfirmId(null)}
                        className="h-6 px-2.5 text-[11px] font-medium text-gray-500 border border-gray-200 hover:bg-gray-50 rounded-md transition-colors"
                      >
                        취소
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmId(m.id)}
                      className="h-7 px-3 text-[11px] font-medium text-gray-400 border border-gray-200 rounded-lg hover:border-red-200 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      제거
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  )
}

// 이름 → 고정 색상 (같은 이름은 항상 같은 색)
function stringToColor(str: string) {
  const palette = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#F43F5E', '#6366F1', '#64748B']
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return palette[Math.abs(hash) % palette.length]
}

// ── SVG 아이콘 ────────────────────────────────────────
function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
