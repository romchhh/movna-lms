'use client'

import { EventsCalendar } from '@/components/calendar/EventsCalendar'
import { TeacherAvailabilityCalendar } from '@/components/calendar/TeacherAvailabilityCalendar'
import {
  ScheduleLessonPanel,
  TeacherCancelLessonDialog,
  TeacherMarkLessonDialog,
} from '@/components/teacher/ScheduleLessonPanel'
import { AddButtonLabel } from '@/components/shared/AddButtonLabel'
import { Card, Empty, PageHeader } from '@/components/shared/UI'
import {
  type TeacherEvent,
  type TeacherSchedule,
  teacherOptimateApi,
} from '@/lib/teacher-optimate-api'
import { mapOptimateEventToCalendar } from '@/lib/calendar-types'
import type { CalendarEvent } from '@/lib/calendar-types'
import { useCallback, useEffect, useMemo, useState } from 'react'

export default function TeacherSchedulePage() {
  const [schedule, setSchedule] = useState<TeacherSchedule | null>(null)
  const [events, setEvents] = useState<TeacherEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [cancelEvent, setCancelEvent] = useState<CalendarEvent | null>(null)
  const [markEvent, setMarkEvent] = useState<CalendarEvent | null>(null)

  const load = useCallback(async (refresh = false) => {
    setLoading(true)
    setError('')
    try {
      const [schedulesRes, eventsRes] = await Promise.all([
        teacherOptimateApi.schedules(undefined, refresh),
        teacherOptimateApi.events(30, 60, refresh),
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
    () => events.map(mapOptimateEventToCalendar),
    [events],
  )

  const plannedCount = useMemo(
    () => events.filter(e => e.completion_label === 'Заплановано').length,
    [events],
  )

  async function handleCancelConfirm(reasonCode: string, note: string) {
    if (!cancelEvent) return
    await teacherOptimateApi.cancelEvent(cancelEvent.id, { reason_code: reasonCode, note })
    setCancelEvent(null)
    await load(true)
  }

  return (
    <>
      <PageHeader
        title="Мій розклад"
        sub={loading ? 'Завантаження...' : `${plannedCount} запланованих · синхронізація з Optimate`}
      />

      {error && <div className="alert">{error}</div>}

      <div className="schedule-page-hero">
        <div className="schedule-page-hero-copy">
          <h2 className="schedule-page-hero-title">Плануйте уроки прямо тут</h2>
          <p className="schedule-page-hero-text">
            Оберіть учня, дату та час — урок одразу потрапить у Optimate. Скасування з причиною
            зберігається в LMS.
          </p>
        </div>
        <button type="button" className="btn btn-primary schedule-page-hero-btn" onClick={() => setCreateOpen(true)}>
          <AddButtonLabel>Запланувати урок</AddButtonLabel>
        </button>
      </div>

      <Card title="Календар уроків">
        <EventsCalendar
          events={calendarEvents}
          loading={loading}
          emptyLabel="Уроків не знайдено — створіть перший урок"
          defaultView="week"
          entityLinks="teacher"
          showParticipants
          showFormatLegend
          enableHomework
          enableCurriculumTopic
          curriculumAudience="teacher"
          enableTeacherCancel
          onTeacherCancel={setCancelEvent}
          enableTeacherMarking
          onTeacherMark={setMarkEvent}
        />
      </Card>

      <Card title="Робочий графік (доступність Optimate)">
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

      <ScheduleLessonPanel
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={load}
      />

      <TeacherCancelLessonDialog
        open={!!cancelEvent}
        eventTitle={cancelEvent?.title || 'Урок'}
        onClose={() => setCancelEvent(null)}
        onConfirm={handleCancelConfirm}
      />

      <TeacherMarkLessonDialog
        open={!!markEvent}
        eventId={markEvent?.id || ''}
        eventTitle={markEvent?.title || 'Урок'}
        onClose={() => setMarkEvent(null)}
        onCompleted={async () => {
          setMarkEvent(null)
          await load(true)
        }}
      />
    </>
  )
}
