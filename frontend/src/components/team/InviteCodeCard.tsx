import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

interface InviteCodeCardProps {
  inviteCode?: string | null
  title?: string
  description?: string
}

export default function InviteCodeCard({
  inviteCode,
  title = '팀 초대 코드',
  description = '팀원을 초대할 때 아래 코드를 공유하세요.',
}: InviteCodeCardProps) {
  const [copied, setCopied] = useState(false)
  const normalizedCode = inviteCode?.trim() ?? ''
  const hasCode = normalizedCode.length > 0

  useEffect(() => {
    if (!copied) return
    const timeoutId = window.setTimeout(() => setCopied(false), 1500)
    return () => window.clearTimeout(timeoutId)
  }, [copied])

  const handleCopy = async () => {
    if (!hasCode) return

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(normalizedCode)
      } else {
        const textArea = document.createElement('textarea')
        textArea.value = normalizedCode
        textArea.style.position = 'fixed'
        textArea.style.opacity = '0'
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
      }
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
      <p className="text-sm font-semibold text-gray-800 mb-1">{title}</p>
      <p className="text-xs text-gray-400 mb-3">{description}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 h-9 rounded-md border border-gray-200 bg-white px-3 inline-flex items-center text-sm tracking-widest font-mono text-gray-800">
          {hasCode ? normalizedCode : '발급된 초대 코드가 없습니다'}
        </code>
        <Button
          type="button"
          onClick={() => {
            void handleCopy()
          }}
          disabled={!hasCode}
          className={`h-9 px-3 text-xs font-semibold ${
            copied ? 'bg-emerald-600 hover:bg-emerald-600' : 'bg-brand hover:bg-brand-hover'
          }`}
        >
          {copied ? '복사됨' : '복사'}
        </Button>
      </div>
    </div>
  )
}
