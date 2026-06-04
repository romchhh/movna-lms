'use client'

import type { ScheduleDay } from '@/lib/teacher-optimate-api'

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 7]

export function TeacherAvailabilityCalendar({
  days,
  timezone,
  startDate,
}: {
  days: ScheduleDay[]
  timezone?: string
  startDate?: string | null
}) {
  const byDay = new Map(days.map(d => [d.day, d]))

  return (
    <div className="cal-availability">
      <div className="cal-availability-meta">
        {startDate && <span>Діє з {startDate}</span>}
        {timezone && <span>{timezone}</span>}
      </div>
      <div className="cal-availability-scroll">
        <div className="cal-availability-grid">
          {DAY_ORDER.map(dayNum => {
            const day = byDay.get(dayNum)
            return (
              <div key={dayNum} className="cal-availability-day">
                <div className="cal-availability-day-head">{day?.day_short ?? '—'}</div>
                {!day?.slots.length && <div className="cal-availability-empty">Вихідний</div>}
                {day?.slots.map((slot, i) => (
                  <div key={i} className="cal-availability-slot">
                    <span>{slot.start_time}</span>
                    <span>–</span>
                    <span>{slot.end_time}</span>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
