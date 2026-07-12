'use client'

import { MarkdownView } from '@/components/homework/MarkdownView'
import { Empty } from '@/components/shared/UI'
import type { FaqPublicItem } from '@/lib/faq-api'
import { useId, useState } from 'react'

interface FaqListProps {
  items: FaqPublicItem[]
  loading?: boolean
  emptyLabel?: string
}

export function FaqList({ items, loading, emptyLabel = 'Питань поки немає' }: FaqListProps) {
  const baseId = useId()
  const [openId, setOpenId] = useState<number | null>(items[0]?.id ?? null)

  if (loading) {
    return <Empty label="Завантаження…" />
  }

  if (!items.length) {
    return <p className="faq-empty">{emptyLabel}</p>
  }

  return (
    <div className="faq-list">
      {items.map(item => {
        const open = openId === item.id
        const panelId = `${baseId}-panel-${item.id}`
        return (
          <div key={item.id} className={`faq-item${open ? ' faq-item--open' : ''}`}>
            <button
              type="button"
              className="faq-item-trigger"
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => setOpenId(open ? null : item.id)}
            >
              <span className="faq-item-question">{item.question}</span>
              <span className="faq-item-chevron" aria-hidden />
            </button>
            <div id={panelId} className="faq-item-panel" hidden={!open}>
              <MarkdownView content={item.answer_md} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
