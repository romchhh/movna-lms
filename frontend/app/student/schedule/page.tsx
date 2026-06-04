'use client'

import { EventsCalendar } from '@/components/calendar/EventsCalendar'
import { Card, PageHeader } from '@/components/shared/UI'
import { toCalendarEvent } from '@/lib/calendar-types'
import { optimateApi } from '@/lib/optimate-api'
import { useCallback, useEffect, useMemo, useState } from 'react'

export default function StudentSchedule() {
  const [events, setEvents] = useState<ReturnType<typeof toCalendarEvent>[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await optimateApi.events(14, 60)
      setEvents(res.data.map(e => toCalendarEvent({
        id: e.id,
        starts_at: e.starts_at,
        ends_at: e.ends_at,
        duration: e.duration,
        product_name: e.product_name,
        product_type_label: e.product_type_label,
        teacher_name: e.teacher_name,
        teacher_names: e.teacher_names,
        teacher_ids: e.teacher_ids,
        completion_label: e.completion_label,
        schedule_class: e.schedule_class,
        product_type: e.product_type,
        is_trial: e.is_trial,
      })))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const upcomingCount = useMemo(
    () => events.filter(
      e => new Date(e.starts_at).getTime() >= Date.now()
        && e.status_label !== 'Проведено'
        && e.status_label !== 'Скасовано',
    ).length,
    [events],
  )

  return (
    <>
      <PageHeader
        title="Розклад занять"
        sub={loading ? 'Завантаження...' : `${events.length} подій · ${upcomingCount} майбутніх`}
      />

      {error && <div className="alert">{error}</div>}

      <Card>
        <EventsCalendar
          events={events}
          loading={loading}
          emptyLabel="Занять не знайдено"
          defaultView="week"
        />
      </Card>
    </>
  )
}
