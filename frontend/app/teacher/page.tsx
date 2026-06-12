'use client'

import { EventsCalendar } from '@/components/calendar/EventsCalendar'
import { HomeworkPendingAlert } from '@/components/homework/HomeworkPendingAlert'
import { PendingRequestsAlert } from '@/components/lesson-requests/PendingRequestsAlert'
import { TeacherLessonStatsPanel } from '@/components/teacher/TeacherLessonStatsPanel'
import { TeacherStudentDetailModal } from '@/components/teacher/TeacherStudentDetailModal'
import { Badge, Card, Empty, PageHeader, StatCard } from '@/components/shared/UI'
import { eventDateKey, formatTimeRange } from '@/lib/calendar-utils'
import { optimateEventToCalendarEvent } from '@/lib/optimate-api'
import { studentInitials } from '@/lib/optimate-ui'
import { TeacherEvent, TeacherStudent, teacherOptimateApi, type TeacherLessonStats } from '@/lib/teacher-optimate-api'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'

const UK_DAY_LONG = ['Неділя', 'Понеділок', 'Вівторок', 'Середа', 'Четвер', "П'ятниця", 'Субота']
const UK_MONTH = [
  'січня', 'лютого', 'березня', 'квітня', 'травня', 'червня',
  'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня',
]

function formatTodayLabel() {
  const now = new Date()
  return `${UK_DAY_LONG[now.getDay()]}, ${now.getDate()} ${UK_MONTH[now.getMonth()]} ${now.getFullYear()}`
}

function isToday(iso: string) {
  return eventDateKey(iso) === eventDateKey(new Date().toISOString())
}

export default function TeacherDashboard() {
  const [students, setStudents] = useState<TeacherStudent[]>([])
  const [studentsTotal, setStudentsTotal] = useState(0)
  const [events, setEvents] = useState<TeacherEvent[]>([])
  const [lessonStats, setLessonStats] = useState<TeacherLessonStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedTitle, setSelectedTitle] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [studentsRes, eventsRes, statsRes] = await Promise.all([
        teacherOptimateApi.students(1, 8),
        teacherOptimateApi.events(1, 14),
        teacherOptimateApi.lessonStats(),
      ])
      setStudents(studentsRes.data)
      setStudentsTotal(studentsRes.total)
      setEvents(eventsRes.data)
      setLessonStats(statsRes)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка завантаження')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const activeStudents = useMemo(
    () => students.filter(s => s.status === 1).length,
    [students],
  )

  const todayEvents = useMemo(
    () => events
      .filter(e => isToday(e.starts_at) && e.completion_label !== 'Скасовано')
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
    [events],
  )

  const calendarEvents = useMemo(
    () => events
      .filter(e => e.completion_label !== 'Скасовано')
      .filter(e => new Date(e.starts_at).getTime() >= Date.now() - 60 * 60 * 1000)
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
      .map(optimateEventToCalendarEvent),
    [events],
  )

  return (
    <>
      <PageHeader title="Дашборд викладача" sub={formatTodayLabel()}>
        <Link href="/teacher/schedule" className="btn btn-teal btn-sm">Розклад</Link>
      </PageHeader>

      {error && <div className="alert">{error}</div>}
      <PendingRequestsAlert href="/teacher/requests" />
      <HomeworkPendingAlert />

      <TeacherLessonStatsPanel stats={lessonStats} loading={loading} />

      <div className="g4 dash-stats" style={{ marginTop: 14 }}>
        <StatCard
          label="Моїх учнів"
          value={loading ? '…' : studentsTotal}
          sub={loading ? '' : `${activeStudents} активних`}
        />
        <StatCard
          label="Занять сьогодні"
          value={loading ? '…' : todayEvents.length}
          sub={loading ? '' : (todayEvents[0]
            ? formatTimeRange(todayEvents[0].starts_at, todayEvents[0].ends_at)
            : 'немає')}
        />
        <StatCard
          label="Найближчі 2 тижні"
          value={loading ? '…' : events.filter(e => e.completion_label !== 'Скасовано').length}
          sub="уроків у календарі"
        />
        <StatCard
          label="Малий баланс"
          value={loading ? '…' : students.filter(s => s.remaining_lessons <= 2).length}
          sub="учнів ≤ 2 уроків"
          danger={!loading && students.some(s => s.remaining_lessons <= 2)}
        />
      </div>

      <div className="g2">
        <Card title="Мої учні">
          {loading && <Empty label="Завантаження..." />}
          {!loading && students.length === 0 && <Empty label="Учнів не знайдено" />}

          {!loading && students.map(student => (
            <button
              key={student.id}
              type="button"
              className="teacher-dash-student-row"
              onClick={() => {
                setSelectedId(student.id)
                setSelectedTitle(student.full_name)
              }}
            >
              <div className="admin-teacher-avatar">{studentInitials(student.full_name)}</div>
              <div className="teacher-dash-student-body">
                <div className="admin-table-title">{student.full_name}</div>
                <div className="admin-table-sub">
                  {student.product_names[0] || student.email || student.phone || `ID ${student.id}`}
                </div>
              </div>
              <Badge
                variant={
                  student.remaining_lessons <= 2
                    ? 'red'
                    : student.remaining_lessons <= 4
                      ? 'amber'
                      : 'green'
                }
              >
                {student.remaining_lessons} ур.
              </Badge>
            </button>
          ))}

          <Link href="/teacher/students" className="btn btn-secondary btn-sm btn-full" style={{ marginTop: 12 }}>
            Всі учні →
          </Link>
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Card title="Розклад на сьогодні">
            {loading && <Empty label="Завантаження..." />}
            {!loading && todayEvents.length === 0 && <Empty label="Сьогодні уроків немає" />}
            {!loading && todayEvents.map(event => (
              <div
                key={event.id}
                className={`schedule-slot ${event.schedule_class === 'group' ? 'group' : 'individual'}`}
                style={{ marginBottom: 8 }}
              >
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--tx)' }}>
                  {formatTimeRange(event.starts_at, event.ends_at)} · {event.product_name || event.product_type_label || 'Урок'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--tx2)', marginTop: 2 }}>
                  {(event.student_names ?? []).join(', ') || '—'}
                </div>
              </div>
            ))}
            <Link href="/teacher/schedule" className="btn btn-secondary btn-sm btn-full" style={{ marginTop: 8 }}>
              Повний розклад →
            </Link>
          </Card>

          <Card title="Найближчі уроки">
            <EventsCalendar
              events={calendarEvents}
              loading={loading}
              emptyLabel="Майбутніх уроків немає"
              defaultView="agenda"
              embed
              entityLinks="teacher"
            />
          </Card>
        </div>
      </div>

      <TeacherStudentDetailModal
        studentId={selectedId}
        title={selectedTitle}
        onClose={() => setSelectedId(null)}
      />
    </>
  )
}
