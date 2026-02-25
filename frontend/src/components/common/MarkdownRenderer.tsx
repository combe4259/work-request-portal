import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import 'highlight.js/styles/github.css'

interface MarkdownRendererProps {
  content: string
  className?: string
  emptyMessage?: string
}

const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    a: [...(defaultSchema.attributes?.a ?? []), ['target'], ['rel']],
    code: [...(defaultSchema.attributes?.code ?? []), ['className']],
    pre: [...(defaultSchema.attributes?.pre ?? []), ['className']],
    span: [...(defaultSchema.attributes?.span ?? []), ['className']],
    input: [...(defaultSchema.attributes?.input ?? []), ['type'], ['checked'], ['disabled']],
  },
} as const

const markdownComponents: Components = {
  h1: (props) => <h1 {...props} className="text-[22px] font-bold text-gray-900 mt-6 mb-3 first:mt-0" />,
  h2: (props) => <h2 {...props} className="text-[19px] font-bold text-gray-900 mt-5 mb-2.5 first:mt-0" />,
  h3: (props) => <h3 {...props} className="text-[16px] font-semibold text-gray-900 mt-4 mb-2 first:mt-0" />,
  p: (props) => <p {...props} className="text-[13px] leading-7 text-gray-700 mb-3 last:mb-0" />,
  strong: (props) => <strong {...props} className="font-semibold text-gray-900" />,
  em: (props) => <em {...props} className="italic text-gray-800" />,
  ul: (props) => <ul {...props} className="list-disc pl-5 space-y-1.5 mb-3 text-[13px] text-gray-700" />,
  ol: (props) => <ol {...props} className="list-decimal pl-5 space-y-1.5 mb-3 text-[13px] text-gray-700" />,
  li: (props) => <li {...props} className="leading-6 marker:text-gray-400" />,
  blockquote: (props) => (
    <blockquote
      {...props}
      className="border-l-4 border-blue-200 bg-blue-50/40 px-3 py-2 my-3 text-[13px] text-gray-700 rounded-r"
    />
  ),
  hr: () => <hr className="my-4 border-t border-gray-200" />,
  a: ({ href, ...props }) => {
    const isExternal = href?.startsWith('http://') || href?.startsWith('https://')
    return (
      <a
        href={href}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
        {...props}
        className="text-blue-600 underline underline-offset-2 hover:text-blue-700 transition-colors"
      />
    )
  },
  table: (props) => (
    <div className="overflow-x-auto my-3">
      <table {...props} className="min-w-full border border-gray-200 rounded-lg overflow-hidden text-[12px]" />
    </div>
  ),
  thead: (props) => <thead {...props} className="bg-gray-50" />,
  th: (props) => <th {...props} className="px-3 py-2 text-left font-semibold text-gray-600 border-b border-gray-200" />,
  td: (props) => <td {...props} className="px-3 py-2 text-gray-700 border-b border-gray-100" />,
  pre: (props) => (
    <pre
      {...props}
      className="bg-[#f6f8fa] border border-gray-200 rounded-lg px-3 py-2.5 my-3 overflow-x-auto text-[12px] leading-6"
    />
  ),
  code: ({ className, ...props }) => {
    const isBlockCode = Boolean(className)
    return (
      <code
        {...props}
        className={isBlockCode ? className : 'px-1 py-0.5 rounded bg-gray-100 text-red-500 text-[12px] font-mono'}
      />
    )
  },
}

export default function MarkdownRenderer({
  content,
  className,
  emptyMessage = '내용이 없습니다.',
}: MarkdownRendererProps) {
  if (!content.trim()) {
    return <p className="text-[12px] text-gray-400">{emptyMessage}</p>
  }

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight, [rehypeSanitize, sanitizeSchema]]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
