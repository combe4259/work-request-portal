import { useState, useRef, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useTeamMembersQuery } from '@/features/auth/queries'
import { useCommentsQuery } from '@/features/comment/queries'
import { useCreateCommentMutation } from '@/features/comment/mutations'
import { useExpandableList } from '@/hooks/useExpandableList'
import ShowMoreButton from '@/components/common/ShowMoreButton'
import type { RefType } from '@/features/common/refTypes'

interface Props {
  refType: RefType
  refId: number | undefined
}

interface MentionSuggestion {
  id: number
  display: string
}

/** @[name](id) → @name 으로 변환하여 표시 */
function renderContent(content: string) {
  return content.replace(/@\[([^\]]+)]\(\d+\)/g, (_, name: string) => `@${name}`)
}

/** textarea의 display 텍스트(@김준)를 저장용 raw 텍스트(@[김준](2))로 변환 */
function toRawContent(text: string, mentionsMap: Map<string, number>): string {
  return text.replace(/@(\S+)/g, (match, name: string) => {
    const userId = mentionsMap.get(name)
    return userId !== undefined ? `@[${name}](${userId})` : match
  })
}

interface MentionTextareaProps {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  onMentionSelected: (userId: number, display: string) => void
  suggestions: MentionSuggestion[]
  disabled?: boolean
}

function MentionTextarea({ value, onChange, onSubmit, onMentionSelected, suggestions, disabled }: MentionTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [query, setQuery] = useState<string | null>(null)
  const [mentionStart, setMentionStart] = useState(-1)
  const [focusIndex, setFocusIndex] = useState(0)

  const filtered = query !== null
    ? suggestions.filter((s) => s.display.toLowerCase().includes(query.toLowerCase()))
    : []

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    const cursor = e.target.selectionStart ?? val.length
    const before = val.slice(0, cursor)
    const match = before.match(/@([^\s@]*)$/)
    if (match) {
      setQuery(match[1])
      setMentionStart(cursor - match[0].length)
      setFocusIndex(0)
    } else {
      setQuery(null)
      setMentionStart(-1)
    }
    onChange(val)
  }

  const selectMention = useCallback((s: MentionSuggestion) => {
    const cursor = textareaRef.current?.selectionStart ?? mentionStart + (query?.length ?? 0) + 1
    const before = value.slice(0, mentionStart)
    const after = value.slice(cursor)
    // textarea에는 @이름 만 표시
    const inserted = `@${s.display} `
    onChange(before + inserted + after)
    onMentionSelected(s.id, s.display)
    setQuery(null)
    setMentionStart(-1)
    requestAnimationFrame(() => {
      const pos = (before + inserted).length
      textareaRef.current?.focus()
      textareaRef.current?.setSelectionRange(pos, pos)
    })
  }, [value, mentionStart, query, onChange, onMentionSelected])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (query !== null && filtered.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setFocusIndex((i) => Math.min(i + 1, filtered.length - 1)); return }
      if (e.key === 'ArrowUp') { e.preventDefault(); setFocusIndex((i) => Math.max(i - 1, 0)); return }
      if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) { e.preventDefault(); selectMention(filtered[focusIndex]); return }
      if (e.key === 'Escape') { setQuery(null); return }
    }
    if (e.key === 'Enter' && e.metaKey) { onSubmit() }
  }

  return (
    <div className="relative flex-1">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="댓글 입력 (@멘션, ⌘+Enter 전송)"
        rows={2}
        disabled={disabled}
        className="w-full px-2.5 py-2 text-[12px] border border-gray-200 rounded-lg focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 resize-none"
      />
      {query !== null && filtered.length > 0 && (
        <ul className="absolute bottom-full left-0 mb-1 min-w-[160px] bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-50">
          {filtered.map((s, i) => (
            <li
              key={s.id}
              onMouseDown={(e) => { e.preventDefault(); selectMention(s) }}
              className={`px-3 py-2 text-[12px] cursor-pointer ${i === focusIndex ? 'bg-blue-50 text-brand font-medium' : 'hover:bg-gray-50 text-gray-700'}`}
            >
              @{s.display}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function CommentSection({ refType, refId }: Props) {
  const [displayValue, setDisplayValue] = useState('')
  // 멘션 선택 시 name → userId 매핑 누적
  const mentionsMapRef = useRef<Map<string, number>>(new Map())

  const currentTeam = useAuthStore((s) => s.currentTeam)
  const teamMembersQuery = useTeamMembersQuery(currentTeam?.id)
  const commentsQuery = useCommentsQuery(refType, refId)
  const createComment = useCreateCommentMutation(refType, refId)

  const comments = commentsQuery.data?.items ?? []
  const visibleComments = useExpandableList(comments, 3)

  const suggestions: MentionSuggestion[] = (teamMembersQuery.data ?? []).map((m) => ({
    id: m.userId,
    display: m.name,
  }))

  const handleMentionSelected = (userId: number, display: string) => {
    mentionsMapRef.current.set(display, userId)
  }

  const handleSubmit = async () => {
    const trimmed = displayValue.trim()
    if (!trimmed) return
    // 전송 직전에 @이름 → @[이름](id) 변환
    const rawContent = toRawContent(trimmed, mentionsMapRef.current)
    await createComment.mutateAsync({ content: rawContent })
    setDisplayValue('')
    mentionsMapRef.current = new Map()
  }

  return (
    <div className="bg-white rounded-xl border border-blue-50 shadow-[0_2px_8px_rgba(30,58,138,0.05)] px-4 py-4">
      <p className="text-[12px] font-semibold text-gray-700 mb-3">댓글 {comments.length}</p>

      <div className="space-y-3 mb-3 max-h-[260px] overflow-y-auto">
        {commentsQuery.isPending ? (
          <p className="text-[12px] text-gray-400">불러오는 중...</p>
        ) : comments.length === 0 ? (
          <p className="text-[12px] text-gray-400">첫 댓글을 남겨보세요.</p>
        ) : (
          visibleComments.visibleItems.map((item) => (
            <div key={item.id} className="flex gap-2.5">
              <div className="w-6 h-6 rounded-full bg-brand/10 flex items-center justify-center text-brand text-[10px] font-bold flex-shrink-0">
                {item.authorName[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[11px] font-semibold text-gray-800">{item.authorName}</span>
                  <span className="text-[10px] text-gray-400">{item.createdAt}</span>
                </div>
                <p className="text-[12px] text-gray-600 leading-relaxed whitespace-pre-wrap">
                  {renderContent(item.content)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      <ShowMoreButton
        expanded={visibleComments.expanded}
        hiddenCount={visibleComments.hiddenCount}
        onToggle={visibleComments.toggle}
        className="mb-3"
      />

      <div className="flex gap-2 pt-2 border-t border-gray-100">
        <MentionTextarea
          value={displayValue}
          onChange={setDisplayValue}
          onSubmit={() => void handleSubmit()}
          onMentionSelected={handleMentionSelected}
          suggestions={suggestions}
          disabled={createComment.isPending}
        />
        <button
          onClick={() => void handleSubmit()}
          disabled={!displayValue.trim() || createComment.isPending}
          className="h-fit px-2.5 py-2 bg-brand text-white text-[11px] font-semibold rounded-lg hover:bg-brand-hover transition-colors disabled:opacity-40 self-end"
        >
          전송
        </button>
      </div>
    </div>
  )
}
