'use client'

import { EventsCalendar } from '@/components/calendar/EventsCalendar'
import { HomeworkStudentModal } from '@/components/homework/HomeworkStudentModal'
import { Card, PageHeader } from '@/components/shared/UI'
import type { CalendarEvent } from '@/lib/calendar-types'
import { optimateApi, optimateEventToCalendarEvent } from '@/lib/optimate-api'
import { useCallback, useEffect, useMemo, useState } from 'react'

export default function StudentSchedule() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [hwModalId, setHwModalId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await optimateApi.events(14, 60)
      setEvents(res.data.map(optimateEventToCalendarEvent))
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
          enableLessonRequests
          enableMeetingLinks
          enableStudentHomework
          enableCurriculumTopic
          curriculumAudience="student"
          onOpenHomework={id => setHwModalId(id)}
        />
      </Card>

      <HomeworkStudentModal
        submissionId={hwModalId}
        onClose={() => setHwModalId(null)}
        onUpdated={() => {}}
      />
    </>
  )
}
