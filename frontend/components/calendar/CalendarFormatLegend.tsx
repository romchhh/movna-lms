'use client'

import {
  type CalendarEvent,
  SCHEDULE_CLASS_COLORS,
  SCHEDULE_CLASS_LABELS,
  SCHEDULE_CLASS_ORDER,
  SCHEDULE_CLASS_SHORT,
  type ScheduleClassKey,
  eventScheduleClass,
} from '@/lib/calendar-types'
import { useMemo } from 'react'

interface CalendarFormatFilterProps {
  events: CalendarEvent[]
  enabled: ReadonlySet<string>
  onChange: (enabled: Set<ScheduleClassKey>) => void
}

export function CalendarFormatFilter({ events, enabled, onChange }: CalendarFormatFilterProps) {
  const counts = useMemo(() => {
    const map: Record<ScheduleClassKey, number> = {
      individual: 0,
      group: 0,
      pair: 0,
      speaking_club: 0,
    }
    for (const event of events) {
      const key = eventScheduleClass(event)
      map[key] += 1
    }
    return map
  }, [events])

  function toggle(key: ScheduleClassKey) {
    const next = new Set(enabled) as Set<ScheduleClassKey>
    if (next.has(key)) {
      next.delete(key)
    } else {
      next.add(key)
    }
    onChange(next)
  }

  return (
    <div className="cal-format-legend cal-format-filter" aria-label="Фільтр форматів занять">
      {SCHEDULE_CLASS_ORDER.map(key => {
        const active = enabled.has(key)
        const count = counts[key]
        return (
          <button
            key={key}
            type="button"
            className={`cal-format-filter-chip${active ? ' cal-format-filter-chip--on' : ''}`}
            aria-pressed={active}
            onClick={() => toggle(key)}
            title={SCHEDULE_CLASS_LABELS[key]}
          >
            <span
              className="cal-format-legend-swatch"
              style={{ background: SCHEDULE_CLASS_COLORS[key] }}
            />
            <span className="cal-format-legend-text">
              {SCHEDULE_CLASS_LABELS[key]}
              <span className="cal-format-legend-short"> ({SCHEDULE_CLASS_SHORT[key]})</span>
            </span>
            {count > 0 && (
              <span className="cal-format-filter-count">{count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/** @deprecated Use CalendarFormatFilter */
export function CalendarFormatLegend() {
  return (
    <div className="cal-format-legend" aria-label="Легенда форматів занять">
      {SCHEDULE_CLASS_ORDER.map(key => (
        <span key={key} className="cal-format-legend-item">
          <span
            className="cal-format-legend-swatch"
            style={{ background: SCHEDULE_CLASS_COLORS[key] }}
          />
          <span className="cal-format-legend-text">
            {SCHEDULE_CLASS_LABELS[key]}
            <span className="cal-format-legend-short"> ({SCHEDULE_CLASS_SHORT[key]})</span>
          </span>
        </span>
      ))}
    </div>
  )
}
