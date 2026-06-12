'use client'

import {
  SCHEDULE_CLASS_COLORS,
  SCHEDULE_CLASS_LABELS,
  SCHEDULE_CLASS_SHORT,
} from '@/lib/calendar-types'

const LEGEND_ORDER = ['individual', 'group', 'pair', 'speaking_club'] as const

export function CalendarFormatLegend() {
  return (
    <div className="cal-format-legend" aria-label="Легенда форматів занять">
      {LEGEND_ORDER.map(key => (
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
