'use client'

import type { FormatBreakdown } from '@/lib/optimate-types'

export type { FormatBreakdown }

const ITEMS = [
  { key: 'individual' as const, label: 'Індивідуальні', color: 'var(--a)' },
  { key: 'group' as const, label: 'Групові', color: 'var(--p)' },
  { key: 'pair' as const, label: 'Парні', color: 'var(--pd)' },
  { key: 'speaking_club' as const, label: 'Speaking club', color: 'var(--t)' },
]

interface FormatBreakdownBarProps {
  data: FormatBreakdown
  subtitle?: string
}

export function FormatBreakdownBar({ data, subtitle }: FormatBreakdownBarProps) {
  const total = ITEMS.reduce((sum, item) => sum + (data[item.key] ?? 0), 0)
  if (total === 0) {
    return <p className="optimate-detail-empty">Немає проведених уроків за період</p>
  }

  return (
    <div className="format-breakdown">
      <div className="format-breakdown-track">
        {ITEMS.map(item => {
          const value = data[item.key] ?? 0
          if (value <= 0) return null
          return (
            <div
              key={item.key}
              className="format-breakdown-segment"
              style={{
                flex: value,
                background: item.color,
              }}
              title={`${item.label}: ${value}`}
            />
          )
        })}
      </div>
      <div className="format-breakdown-legend">
        {ITEMS.map(item => {
          const value = data[item.key] ?? 0
          if (value <= 0) return null
          const pct = Math.round((value / total) * 100)
          return (
            <span key={item.key} className="format-breakdown-legend-item">
              <span className="format-breakdown-dot" style={{ background: item.color }} />
              {item.label}: {value} ({pct}%)
            </span>
          )
        })}
      </div>
      {subtitle && <p className="format-breakdown-sub">{subtitle}</p>}
    </div>
  )
}
