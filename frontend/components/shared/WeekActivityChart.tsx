'use client'

import type { WeekActivityDay } from '@/lib/optimate-types'

interface WeekActivityChartProps {
  data: WeekActivityDay[]
  caption: string
  doneClassName?: string
  plannedClassName?: string
}

export function WeekActivityChart({
  data,
  caption,
  doneClassName = 'teacher-week-chart-bar--done',
  plannedClassName = 'teacher-week-chart-bar--planned',
}: WeekActivityChartProps) {
  const maxVal = Math.max(...data.map(a => a.total), 1)

  return (
    <div className="teacher-week-chart">
      <div className="teacher-week-chart-bars">
        {data.map(a => (
          <div key={a.day} className="teacher-week-chart-col">
            <div className="teacher-week-chart-count">{a.total}</div>
            <div
              className="teacher-week-chart-track"
              title={`Проведено: ${a.completed}, заплановано: ${a.planned}`}
            >
              <div
                className="teacher-week-chart-stack"
                style={{ height: `${(a.total / maxVal) * 100}%` }}
              >
                {a.completed > 0 && (
                  <div className={`teacher-week-chart-bar ${doneClassName}`} style={{ flex: a.completed }} />
                )}
                {a.planned > 0 && (
                  <div className={`teacher-week-chart-bar ${plannedClassName}`} style={{ flex: a.planned }} />
                )}
              </div>
            </div>
            <div className="teacher-week-chart-label">{a.label}</div>
          </div>
        ))}
      </div>
      <p className="teacher-week-chart-caption">{caption}</p>
    </div>
  )
}
