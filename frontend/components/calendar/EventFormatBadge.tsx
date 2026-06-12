'use client'

import {
  SCHEDULE_CLASS_LABELS,
  SCHEDULE_CLASS_SHORT,
} from '@/lib/calendar-types'

interface EventFormatBadgeProps {
  scheduleClass?: string
  compact?: boolean
}

export function EventFormatBadge({ scheduleClass, compact }: EventFormatBadgeProps) {
  if (!scheduleClass) return null
  const label = SCHEDULE_CLASS_SHORT[scheduleClass] ?? scheduleClass
  const title = SCHEDULE_CLASS_LABELS[scheduleClass] ?? scheduleClass

  return (
    <span
      className={`cal-format-badge cal-format-badge--${scheduleClass}${compact ? ' cal-format-badge--compact' : ''}`}
      title={title}
    >
      {label}
    </span>
  )
}
