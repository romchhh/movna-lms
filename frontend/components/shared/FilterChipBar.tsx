'use client'

import {
  STATUS_CHIP_STYLES,
  statusText,
  variantToChipAccent,
  type StatusChipAccent,
} from '@/lib/status-ui'

export interface FilterChip<T extends string = string> {
  key: T
  label: string
  emoji?: string
  count?: number
  accent?: StatusChipAccent
}

interface FilterChipBarProps<T extends string> {
  value: T
  onChange: (key: T) => void
  chips: FilterChip<T>[]
  accent?: StatusChipAccent
  showCounts?: boolean
}

export function FilterChipBar<T extends string>({
  value,
  onChange,
  chips,
  accent = 'purple',
  showCounts = false,
}: FilterChipBarProps<T>) {
  return (
    <>
      {chips.map(chip => {
        const isActive = value === chip.key
        const chipAccent = chip.accent ?? accent
        const styles = STATUS_CHIP_STYLES[chipAccent]
        return (
          <button
            key={chip.key}
            type="button"
            onClick={() => onChange(chip.key)}
            className="btn btn-sm"
            style={{
              background: isActive ? styles.activeBg : 'var(--bg2)',
              color: isActive ? styles.activeColor : 'var(--tx2)',
              border: `.5px solid ${isActive ? styles.activeBorder : 'var(--bd2)'}`,
            }}
          >
            {statusText(chip.emoji ?? '', chip.label)}
            {showCounts && chip.count != null && chip.count > 0 && (
              <span className="nav-badge" style={{ marginLeft: 6, display: 'inline-block' }}>
                {chip.count}
              </span>
            )}
          </button>
        )
      })}
    </>
  )
}

/** @deprecated use chip.accent directly */
export function accentFromVariant(variant: Parameters<typeof variantToChipAccent>[0]): StatusChipAccent {
  return variantToChipAccent(variant)
}
