'use client'

import { EventsCalendar } from '@/components/calendar/EventsCalendar'
import {
  ScheduleLessonPanel,
  TeacherCancelLessonDialog,
  TeacherMarkLessonDialog,
} from '@/components/teacher/ScheduleLessonPanel'
import { AddButtonLabel } from '@/components/shared/AddButtonLabel'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Empty, StatCard } from '@/components/shared/UI'
import type { CalendarEvent } from '@/lib/calendar-types'
import { mapOptimateEventToCalendar } from '@/lib/calendar-types'
import { formatEventDateFull, formatTimeRange } from '@/lib/calendar-utils'
import { optimatePortalHomeUrl } from '@/lib/optimate-portal'
import {
  type TeacherEvent,
  teacherOptimateApi,
} from '@/lib/teacher-optimate-api'
import { useCallback, useEffect, useMemo, useState } from 'react'

type LessonsTab = 'upcoming' | 'history' | 'calendar' | 'all'

interface TeacherStudentLessonsPanelProps {
  studentOptimateId: string
  studentName: string
}

function eventHasStudent(event: TeacherEvent, studentId: string): boolean {
  if (event.student_ids?.map(String).includes(String(studentId))) return true
  return false
}

function isCancelled(event: TeacherEvent): boolean {
  return event.completion_label === 'Скасовано'
}

function isCompleted(event: TeacherEvent): boolean {
  return event.is_completed === true || event.completion_label === 'Проведено'
}

function isUpcoming(event: TeacherEvent, now: number): boolean {
  if (isCancelled(event) || isCompleted(event)) return false
  return new Date(event.starts_at).getTime() >= now - 60 * 60 * 1000
}

function statusVariant(event: TeacherEvent): 'green' | 'amber' | 'red' | 'gray' | 'purple' {
  if (isCancelled(event)) return 'red'
  if (isCompleted(event)) return 'green'
  if (event.is_trial) return 'purple'
  if (event.completion_label === 'Заплановано') return 'amber'
  return 'gray'
}

export function TeacherStudentLessonsPanel({
  studentOptimateId,
  studentName,
}: TeacherStudentLessonsPanelProps) {
  const [events, setEvents] = useState<TeacherEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<LessonsTab>('upcoming')
  const [createOpen, setCreateOpen] = useState(false)
  const [cancelEvent, setCancelEvent] = useState<CalendarEvent | null>(null)
  const [markEvent, setMarkEvent] = useState<CalendarEvent | null>(null)
  const [optiSyncNotice, setOptiSyncNotice] = useState('')

  const load = useCallback(async (refresh = false) => {
    setLoading(true)
    setError('')
    try {
      const res = await teacherOptimateApi.events(180, 90, refresh)
      setEvents(res.data.filter(e => eventHasStudent(e, studentOptimateId)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка завантаження уроків')
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [studentOptimateId])

  useEffect(() => {
    load()
  }, [load])

  const now = Date.now()

  const stats = useMemo(() => {
    const upcoming = events.filter(e => isUpcoming(e, now))
    const completed = events.filter(isCompleted)
    const cancelled = events.filter(isCancelled)
    const trial = events.filter(e => e.is_trial)
    const hours = completed.reduce((sum, e) => sum + (e.duration || 0), 0) / 60
    return {
      upcoming: upcoming.length,
      completed: completed.length,
      cancelled: cancelled.length,
      trial: trial.length,
      hours: Math.round(hours * 10) / 10,
    }
  }, [events, now])

  const upcoming = useMemo(
    () => events
      .filter(e => isUpcoming(e, now))
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
    [events, now],
  )

  const history = useMemo(
    () => events
      .filter(e => !isUpcoming(e, now))
      .sort((a, b) => b.starts_at.localeCompare(a.starts_at)),
    [events, now],
  )

  const allSorted = useMemo(
    () => [...events].sort((a, b) => b.starts_at.localeCompare(a.starts_at)),
    [events],
  )

  const calendarEvents = useMemo(
    () => events.map(mapOptimateEventToCalendar),
    [events],
  )

  const listEvents = tab === 'upcoming'
    ? upcoming
    : tab === 'history'
      ? history
      : tab === 'all'
        ? allSorted
        : []

  async function handleCancelConfirm(reasonCode: string, note: string) {
    if (!cancelEvent) return
    await teacherOptimateApi.cancelEvent(cancelEvent.id, { reason_code: reasonCode, note })
    setCancelEvent(null)
    await load(true)
  }

  return (
    <section className="stc-panel teacher-student-lessons-panel">
      <div className="stc-panel-head">
        <div>
          <h3>Уроки з {studentName}</h3>
          <p className="stc-panel-sub">
            Заплановані, історія та календар — останні 6 міс. і найближчі 3 міс.
          </p>
        </div>
        <div className="teacher-student-lessons-head-actions">
          <button type="button" className="btn btn-sm btn-secondary" disabled={loading} onClick={() => load(true)}>
            Оновити
          </button>
          <button type="button" className="btn btn-sm btn-teal" onClick={() => setCreateOpen(true)}>
            <AddButtonLabel>Запланувати урок</AddButtonLabel>
          </button>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}
      {optiSyncNotice && (
        <div className="alert" style={{ marginBottom: 12 }}>
          {optiSyncNotice}{' '}
          <a href={optimatePortalHomeUrl()} target="_blank" rel="noopener noreferrer">
            Відкрити Optimate →
          </a>
        </div>
      )}

      <div className="teacher-student-lessons-stats g4">
        <StatCard label="Заплановано" value={loading ? '…' : stats.upcoming} />
        <StatCard label="Проведено" value={loading ? '…' : stats.completed} />
        <StatCard label="Скасовано" value={loading ? '…' : stats.cancelled} />
        <StatCard
          label="Годин проведено"
          value={loading ? '…' : stats.hours}
          sub={stats.trial > 0 ? `${stats.trial} пробних` : undefined}
        />
      </div>

      <div className="teacher-student-lessons-tabs" role="tablist" aria-label="Розділи уроків">
        {(
          [
            ['upcoming', `Заплановані (${stats.upcoming})`],
            ['history', `Історія (${history.length})`],
            ['calendar', 'Календар'],
            ['all', `Усі (${events.length})`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={`teacher-student-lessons-tab${tab === key ? ' is-active' : ''}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'calendar' ? (
        <div className="teacher-student-lessons-calendar">
          <EventsCalendar
            events={calendarEvents}
            loading={loading}
            emptyLabel="Уроків з цим учнем не знайдено"
            defaultView="agenda"
            embed
            entityLinks="teacher"
            showParticipants
            enableHomework
            enableCurriculumTopic
            curriculumAudience="teacher"
            enableTeacherCancel
            onTeacherCancel={setCancelEvent}
            enableTeacherMarking
            onTeacherMark={setMarkEvent}
          />
        </div>
      ) : (
        <div className="teacher-student-lessons-list">
          {loading && <Empty label="Завантаження уроків…" />}
          {!loading && listEvents.length === 0 && (
            <Empty
              label={
                tab === 'upcoming'
                  ? 'Немає запланованих уроків'
                  : tab === 'history'
                    ? 'Історії уроків ще немає'
                    : 'Уроків не знайдено'
              }
            />
          )}
          {!loading && listEvents.map(event => (
            <article key={event.id} className="teacher-student-lesson-row">
              <div className="teacher-student-lesson-when">
                <div className="teacher-student-lesson-date">{formatEventDateFull(event.starts_at)}</div>
                <div className="teacher-student-lesson-time">
                  {formatTimeRange(event.starts_at, event.ends_at)}
                  {event.duration ? ` · ${event.duration} хв` : ''}
                </div>
              </div>
              <div className="teacher-student-lesson-body">
                <div className="teacher-student-lesson-title">
                  {event.product_name || event.product_type_label || 'Урок'}
                  {event.is_trial ? ' · пробний' : ''}
                </div>
                <div className="teacher-student-lesson-meta">
                  {event.schedule_class === 'group' ? 'Група' : event.schedule_class === 'pair' ? 'Пара' : 'Індивідуальний'}
                  {event.cancellation_reason ? ` · ${event.cancellation_reason}` : ''}
                  {event.cancellation_note ? ` · ${event.cancellation_note}` : ''}
                </div>
              </div>
              <StatusBadge
                label={event.completion_label || '—'}
                variant={statusVariant(event)}
              />
              <div className="teacher-student-lesson-actions">
                {isUpcoming(event, now) && (
                  <>
                    <button
                      type="button"
                      className="btn btn-sm btn-teal"
                      onClick={() => setMarkEvent(mapOptimateEventToCalendar(event))}
                    >
                      Відмітити
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      onClick={() => setCancelEvent(mapOptimateEventToCalendar(event))}
                    >
                      Скасувати
                    </button>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <ScheduleLessonPanel
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => load(true)}
        preselectedStudentId={studentOptimateId}
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
        onCompleted={async ({ optimate_synced }) => {
          if (!optimate_synced) {
            setOptiSyncNotice(
              'Відмітку збережено в LMS. Для нарахування ЗП відмітьте заняття в Optimate.',
            )
          } else {
            setOptiSyncNotice('')
          }
          setMarkEvent(null)
          await load(true)
        }}
      />
    </section>
  )
}
