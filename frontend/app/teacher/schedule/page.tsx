'use client'

import { EventsCalendar } from '@/components/calendar/EventsCalendar'
import { TeacherAvailabilityCalendar } from '@/components/calendar/TeacherAvailabilityCalendar'
import { Card, Empty, PageHeader } from '@/components/shared/UI'
import {
  type TeacherEvent,
  type TeacherSchedule,
  teacherOptimateApi,
} from '@/lib/teacher-optimate-api'
import { toCalendarEvent } from '@/lib/calendar-types'
import { useCallback, useEffect, useMemo, useState } from 'react'

export default function TeacherSchedulePage() {
  const [schedule, setSchedule] = useState<TeacherSchedule | null>(null)
  const [events, setEvents] = useState<TeacherEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [schedulesRes, eventsRes] = await Promise.all([
        teacherOptimateApi.schedules(),
        teacherOptimateApi.events(7, 45),
      ])
      setSchedule(schedulesRes.data[0] ?? null)
      setEvents(eventsRes.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const calendarEvents = useMemo(
    () => events.map(e => toCalendarEvent({
      id: e.id,
      starts_at: e.starts_at,
      ends_at: e.ends_at,
      duration: e.duration,
      product_name: e.product_name,
      product_type_label: e.product_type_label,
      student_names: e.student_names,
      student_ids: e.student_ids,
      completion_label: e.completion_label,
      schedule_class: e.schedule_class,
      product_type: e.product_type,
      is_trial: e.is_trial,
    })),
    [events],
  )

  return (
    <>
      <PageHeader
        title="Мій розклад"
        sub={loading ? 'Завантаження...' : 'Уроки та робочий графік з Optimate'}
      />

      {error && <div className="alert">{error}</div>}

      <Card title="Робочий графік (доступність)">
        {loading && <Empty label="Завантаження..." />}
        {!loading && !schedule && <Empty label="Графік не налаштовано в Optimate" />}
        {!loading && schedule && (
          <TeacherAvailabilityCalendar
            days={schedule.days}
            timezone={schedule.timezone}
            startDate={schedule.start_date}
          />
        )}
      </Card>

      <Card title="Календар уроків">
        <EventsCalendar
          events={calendarEvents}
          loading={loading}
          emptyLabel="Уроків не знайдено"
          defaultView="week"
          entityLinks="teacher"
        />
      </Card>
    </>
  )
}
