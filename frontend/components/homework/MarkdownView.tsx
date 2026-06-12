'use client'

import { isRichHtml, sanitizeHtml } from '@/lib/rich-text'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export function MarkdownView({
  content,
  className,
  emptyPlaceholder,
}: {
  content: string
  className?: string
  emptyPlaceholder?: string
}) {
  if (!content.trim()) {
    return (
      <p className="md-view-empty">
        {emptyPlaceholder ?? '—'}
      </p>
    )
  }

  if (isRichHtml(content)) {
    return (
      <div
        className={`md-view prose-hw rte-content${className ? ` ${className}` : ''}`}
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }}
      />
    )
  }

  return (
    <div className={`md-view prose-hw${className ? ` ${className}` : ''}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  )
}
