import { useState } from 'react'
import type { FlowItemType, AddItemModalConfig } from '@/features/flow/types'

interface Props {
  config: AddItemModalConfig
  onClose: () => void
  onSave: (itemType: FlowItemType, title: string) => Promise<void>
}

const TYPE_META: Record<FlowItemType, { label: string; desc: string; icon: React.ReactNode; color: string }> = {
  TECH_TASK: {
    label: '기술과제',
    desc: '개발/설계 작업 단위',
    color: 'border-indigo-300 bg-indigo-50 text-indigo-700',
    icon: (
      <svg width="18" height="18" viewBox="0 0 14 14" fill="none">
        <path d="M2 4.5L6.5 2l4.5 2.5M2 4.5v5L6.5 12l4.5-2.5V4.5M2 4.5L6.5 7l4.5-2.5M6.5 7v5" stroke="#6366F1" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
    ),
  },
  TEST_SCENARIO: {
    label: '테스트 시나리오',
    desc: '기능 검증 테스트 케이스',
    color: 'border-emerald-300 bg-emerald-50 text-emerald-700',
    icon: (
      <svg width="18" height="18" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="5" stroke="#10B981" strokeWidth="1.3" />
        <path d="M4.5 7l2 2 3-3.5" stroke="#10B981" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  DEPLOYMENT: {
    label: '배포',
    desc: '릴리스 및 배포 계획',
    color: 'border-orange-300 bg-orange-50 text-orange-700',
    icon: (
      <svg width="18" height="18" viewBox="0 0 14 14" fill="none">
        <path d="M7 1.5v7M4.5 6L7 8.5 9.5 6" stroke="#F97316" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2 10.5h10" stroke="#F97316" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
}

export default function AddItemModal({ config, onClose, onSave }: Props) {
  const [selectedType, setSelectedType] = useState<FlowItemType>(config.allowedTypes[0])
  const [title, setTitle] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!title.trim()) {
      setError('제목을 입력해주세요.')
      return
    }
    setIsSaving(true)
    setError('')
    try {
      await onSave(selectedType, title.trim())
    } catch (error) {
      const message = error instanceof Error && error.message
        ? error.message
        : '저장에 실패했습니다. 다시 시도해주세요.'
      setError(message)
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 딤 */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />

      {/* 모달 */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[420px] mx-4 overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-[14px] font-bold text-gray-900">단계 추가</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">새 항목을 생성하고 플로우에 연결합니다</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* 타입 선택 */}
          <div>
            <p className="text-[11px] font-semibold text-gray-500 mb-2">생성할 단계 선택</p>
            <div className="grid grid-cols-1 gap-2">
              {config.allowedTypes.map((type) => {
                const meta = TYPE_META[type]
                const isSelected = selectedType === type
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSelectedType(type)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${
                      isSelected
                        ? meta.color + ' border-opacity-100'
                        : 'border-gray-100 hover:border-gray-200 bg-white'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSelected ? 'bg-white/60' : 'bg-gray-50'}`}>
                      {meta.icon}
                    </div>
                    <div>
                      <p className={`text-[12px] font-semibold ${isSelected ? 'text-current' : 'text-gray-700'}`}>{meta.label}</p>
                      <p className={`text-[10px] ${isSelected ? 'text-current opacity-70' : 'text-gray-400'}`}>{meta.desc}</p>
                    </div>
                    {isSelected && (
                      <div className="ml-auto">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <circle cx="7" cy="7" r="6" fill="currentColor" opacity="0.2" />
                          <path d="M4 7l2.5 2.5L10 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 제목 입력 */}
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1.5">
              제목 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setError('') }}
              onKeyDown={(e) => { if (e.key === 'Enter') void handleSave() }}
              placeholder={`${TYPE_META[selectedType].label} 제목 입력`}
              className={`w-full h-9 px-3 text-[13px] border rounded-lg focus:outline-none focus:ring-1 transition-colors ${
                error ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : 'border-gray-200 focus:border-brand focus:ring-brand/20'
              }`}
              autoFocus
            />
            {error && <p className="text-[11px] text-red-500 mt-1">{error}</p>}
          </div>
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 bg-gray-50 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-4 text-[12px] font-medium text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSaving}
            className="h-8 px-5 text-[12px] font-semibold text-white bg-brand hover:bg-brand-hover disabled:opacity-60 rounded-lg transition-colors"
          >
            {isSaving ? '생성 중...' : '생성 및 연결'}
          </button>
        </div>
      </div>
    </div>
  )
}
