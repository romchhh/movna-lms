'use client'

type ChipAccent = 'purple' | 'teal' | 'red'

const ACCENT_STYLES: Record<ChipAccent, { activeBg: string; activeColor: string; activeBorder: string }> = {
  purple: { activeBg: 'var(--pl)', activeColor: 'var(--pd)', activeBorder: 'var(--pm)' },
  teal: { activeBg: 'var(--tl)', activeColor: 'var(--td)', activeBorder: 'var(--t)' },
  red: { activeBg: 'var(--rl)', activeColor: 'var(--rd)', activeBorder: 'var(--rd)' },
}

export interface FilterChip<T extends string = string> {
  key: T
  label: string
  count?: number
}

interface FilterChipBarProps<T extends string> {
  value: T
  onChange: (key: T) => void
  chips: FilterChip<T>[]
  accent?: ChipAccent
  showCounts?: boolean
}

export function FilterChipBar<T extends string>({
  value,
  onChange,
  chips,
  accent = 'purple',
  showCounts = false,
}: FilterChipBarProps<T>) {
  const active = ACCENT_STYLES[accent]

  return (
    <>
      {chips.map(chip => {
        const isActive = value === chip.key
        return (
          <button
            key={chip.key}
            type="button"
            onClick={() => onChange(chip.key)}
            className="btn btn-sm"
            style={{
              background: isActive ? active.activeBg : 'var(--bg2)',
              color: isActive ? active.activeColor : 'var(--tx2)',
              border: `.5px solid ${isActive ? active.activeBorder : 'var(--bd2)'}`,
            }}
          >
            {chip.label}
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
