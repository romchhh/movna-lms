'use client'

import { EventsCalendar } from '@/components/calendar/EventsCalendar'
import { HomeworkPendingAlert } from '@/components/homework/HomeworkPendingAlert'
import { PendingRequestsAlert } from '@/components/lesson-requests/PendingRequestsAlert'
import { TeacherLessonStatsPanel } from '@/components/teacher/TeacherLessonStatsPanel'
import { TeacherStudentCardActions } from '@/components/teacher/TeacherStudentCardActions'
import { TeacherStudentDetailModal } from '@/components/teacher/TeacherStudentDetailModal'
import { DashboardHero } from '@/components/shared/DashboardHero'
import { Badge, Card, Empty, StatCard } from '@/components/shared/UI'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { useLmsProfiles } from '@/hooks/useLmsProfiles'
import { eventDateKey, formatTimeRange } from '@/lib/calendar-utils'
import { optimateEventToCalendarEvent } from '@/lib/optimate-api'
import { TeacherEvent, TeacherStudent, teacherOptimateApi, type TeacherLessonStats } from '@/lib/teacher-optimate-api'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'

function isToday(iso: string) {
  return eventDateKey(iso) === eventDateKey(new Date().toISOString())
}

export default function TeacherDashboard() {
  const [students, setStudents] = useState<TeacherStudent[]>([])
  const [studentsTotal, setStudentsTotal] = useState(0)
  const [events, setEvents] = useState<TeacherEvent[]>([])
  const [lessonStats, setLessonStats] = useState<TeacherLessonStats | null>(null)
  const [statsYear, setStatsYear] = useState<number | undefined>(undefined)
  const [statsMonth, setStatsMonth] = useState<number | undefined>(undefined)
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
        teacherOptimateApi.lessonStats(365, 90, false, statsYear, statsMonth),
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
  }, [statsYear, statsMonth])

  useEffect(() => {
    load()
  }, [load])

  const regularStudents = useMemo(
    () => students.filter(s => !s.is_speaking_club_only),
    [students],
  )

  const activeStudents = useMemo(
    () => regularStudents.filter(s => s.status === 1).length,
    [regularStudents],
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

  useLmsProfiles(students.map(s => s.id))

  return (
    <div className="dash-home">
      <DashboardHero
        role="teacher"
        fallbackName="Марія Іваненко"
        subtitle={loading ? 'Завантаження…' : 'Ваш день, учні та найближчі уроки'}
        actions={
          <>
            <Link href="/teacher/salaries" className="btn btn-sm dash-hero-btn btn-secondary">
              Зарплата
            </Link>
            <Link href="/teacher/schedule" className="btn btn-sm dash-hero-btn">
              Розклад
            </Link>
          </>
        }
      />

      {error && <div className="alert">{error}</div>}
      <PendingRequestsAlert href="/teacher/requests" />
      <HomeworkPendingAlert />

      <TeacherLessonStatsPanel
        stats={lessonStats}
        loading={loading}
        prominent
        selectedYear={statsYear ?? lessonStats?.stats_year}
        selectedMonth={statsMonth ?? lessonStats?.stats_month}
        onMonthChange={(year, month) => {
          setStatsYear(year)
          setStatsMonth(month)
        }}
      />

      <div className="g4 dash-stats" style={{ marginTop: 14 }}>
        <StatCard
          label="Моїх учнів"
          value={loading ? '…' : (lessonStats?.students_with_regular_lessons ?? studentsTotal)}
          sub={loading ? '' : `${activeStudents} активних · без Speaking Club`}
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
          value={loading ? '…' : regularStudents.filter(s => s.remaining_lessons <= 2).length}
          sub="учнів ≤ 2 уроків"
          danger={!loading && regularStudents.some(s => s.remaining_lessons <= 2)}
        />
      </div>

      <div className="g2 dash-grid">
        <Card title="Мої учні">
          {loading && <Empty label="Завантаження..." />}
          {!loading && students.length === 0 && <Empty label="Учнів не знайдено" />}

          {!loading && students.map(student => (
            <div key={student.id} className="teacher-dash-student-row-wrap">
              <button
                type="button"
                className="teacher-dash-student-row"
                onClick={() => {
                  setSelectedId(student.id)
                  setSelectedTitle(student.full_name)
                }}
              >
                <UserAvatar name={student.full_name} optimateId={student.id} size="lg" kind="student" />
                <div className="teacher-dash-student-body">
                  <div className="admin-table-title">
                    {student.full_name}
                    {student.is_speaking_club_only && (
                      <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--tx3)' }}>SC</span>
                    )}
                  </div>
                  <div className="admin-table-sub">
                    {student.is_speaking_club_only
                      ? 'Speaking Club'
                      : (student.product_names[0] || student.email || student.phone || `ID ${student.id}`)}
                  </div>
                </div>
                <Badge
                  variant={
                    student.is_speaking_club_only
                      ? 'gray'
                      : student.remaining_lessons <= 2
                        ? 'red'
                        : student.remaining_lessons <= 4
                          ? 'amber'
                          : 'green'
                  }
                >
                  {student.is_speaking_club_only ? 'SC' : `${student.remaining_lessons} ур.`}
                </Badge>
              </button>
              <TeacherStudentCardActions
                studentId={student.id}
                studentName={student.full_name}
                compact
                showStatus
              />
            </div>
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
                className={`schedule-slot ${
                  event.schedule_class === 'group'
                    ? 'group'
                    : event.schedule_class === 'speaking_club'
                      ? 'speaking-club'
                      : event.schedule_class === 'pair'
                        ? 'pair'
                        : 'individual'
                }`}
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
    </div>
  )
}
