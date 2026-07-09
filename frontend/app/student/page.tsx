'use client'

import { EventsCalendar } from '@/components/calendar/EventsCalendar'
import { StudentLearningResourcesCard } from '@/components/student/StudentLearningResourcesCard'
import { StudentCurriculumSummary } from '@/components/curriculum/StudentCurriculumSummary'
import { HomeworkAlert } from '@/components/homework/HomeworkAlert'
import { HomeworkStudentModal } from '@/components/homework/HomeworkStudentModal'
import { DashboardHero } from '@/components/shared/DashboardHero'
import { Badge, ProgressBar, StatCard } from '@/components/shared/UI'
import { formatTimeRange } from '@/lib/calendar-utils'
import type { CalendarEvent } from '@/lib/calendar-types'
import {
  PRODUCT_ACCENT,
  StudentOverview,
  isEventActive,
  optimateApi,
  optimateEventToCalendarEvent,
} from '@/lib/optimate-api'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'

export default function StudentDashboard() {
  const [overview, setOverview] = useState<StudentOverview | null>(null)
  const [scheduleEvents, setScheduleEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [hwModalId, setHwModalId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [ov, ev] = await Promise.all([
        optimateApi.overview(),
        optimateApi.events(7, 21),
      ])
      setOverview(ov)
      setScheduleEvents(ev.data.map(optimateEventToCalendarEvent))
    } catch {
      setOverview(null)
      setScheduleEvents([])
    } finally {
      setLoading(false)
    }
  }, [])

  const calendarEvents = useMemo(() => scheduleEvents, [scheduleEvents])

  useEffect(() => {
    load()
  }, [load])

  const nextEvent = overview?.upcoming_events[0]
  const totalRemaining = overview?.total_lessons_remaining ?? 0
  const totalUsed = overview?.total_lessons_used ?? 0
  const totalPurchased = overview?.total_lessons_purchased ?? 0

  return (
    <div className="dash-home">
      <DashboardHero
        role="student"
        fallbackName="Олена Коваль"
        subtitle={loading ? 'Завантаження даних…' : 'Ваші баланси та найближчі заняття'}
      />

      <HomeworkAlert onOpen={id => setHwModalId(id)} />

      <div className="g4 dash-stats">
        <StatCard
          label="Залишок"
          value={loading ? '…' : totalRemaining}
          sub="уроків доступно"
        />
        <StatCard
          label="Використано"
          value={loading ? '…' : totalUsed}
          sub="уроків за весь час"
        />
        <StatCard
          label="Куплено"
          value={loading ? '…' : totalPurchased}
          sub="уроків за весь час"
        />
        <StatCard
          label="Найближче заняття"
          value={loading ? '…' : nextEvent
            ? new Intl.DateTimeFormat('uk-UA', { day: '2-digit', month: '2-digit' }).format(new Date(nextEvent.starts_at))
            : '—'}
          sub={nextEvent ? formatTimeRange(nextEvent.starts_at, nextEvent.ends_at) : 'немає в календарі'}
        />
        <StatCard
          label="Транзакції"
          value={loading ? '…' : overview?.recent_transactions.length ?? 0}
          sub="останніх операцій"
        />
      </div>

      <div className="g2 dash-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card">
            <div className="card-title">Матеріали від викладача</div>
            <StudentLearningResourcesCard compact />
          </div>

          <div className="card">
            <div className="card-title">Моя навчальна програма</div>
            <StudentCurriculumSummary compact showLink />
          </div>

          <div className="card">
            <div className="card-title">Наступне заняття</div>
            {!nextEvent && !loading && (
              <p style={{ color: 'var(--tx3)', fontSize: 14 }}>Найближчих занять немає</p>
            )}
            {nextEvent && (
              <>
                <div
                  className={`schedule-slot ${
                    nextEvent.schedule_class === 'group'
                      ? 'group'
                      : nextEvent.schedule_class === 'speaking_club'
                        ? 'speaking-club'
                        : nextEvent.schedule_class === 'pair'
                          ? 'pair'
                          : 'individual'
                  }`}
                  style={{ marginBottom: 10 }}
                >
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    {nextEvent.product_name || nextEvent.product_type_label}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--tx2)', marginTop: 4 }}>
                    {formatTimeRange(nextEvent.starts_at, nextEvent.ends_at)}
                    {nextEvent.teacher_name ? ` · ${nextEvent.teacher_name}` : ''}
                  </div>
                </div>
                <Link
                  href="/student/schedule"
                  className="btn btn-primary btn-full"
                  style={{ textDecoration: 'none', justifyContent: 'center', opacity: isEventActive(nextEvent.starts_at, nextEvent.ends_at) ? 1 : 0.7 }}
                >
                  Переглянути розклад
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-title">Календар занять</div>
          <EventsCalendar
            events={calendarEvents}
            loading={loading}
            emptyLabel="Занять не знайдено"
            defaultView="week"
            embed
            enableLessonRequests
            enableMeetingLinks
            enableStudentHomework
            enableCurriculumTopic
            curriculumAudience="student"
            onOpenHomework={id => setHwModalId(id)}
          />
          <Link
            href="/student/schedule"
            className="btn btn-secondary btn-full"
            style={{ marginTop: 12, textDecoration: 'none', justifyContent: 'center' }}
          >
            Повний розклад
          </Link>
        </div>

        <div className="card">
          <div className="card-title">Баланси з Optimate</div>
          {!loading && (!overview || overview.balances.length === 0) && (
            <p style={{ color: 'var(--tx3)', fontSize: 14 }}>Баланси не знайдено</p>
          )}
          {overview?.balances.map(product => {
            const accent = PRODUCT_ACCENT[product.product_type] ?? PRODUCT_ACCENT[1]
            const purchased = product.lessons_total > 0
              ? product.lessons_total
              : product.lessons_remaining + product.lessons_used
            const pct = purchased > 0
              ? (product.lessons_remaining / purchased) * 100
              : 0
            return (
              <div key={product.product_id || product.product_name} className="optimate-dash-balance-row">
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{product.product_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--tx2)', marginTop: 2 }}>
                    <Badge variant={accent.badge}>{product.product_type_label}</Badge>
                    {' '}
                    Залишок {product.lessons_remaining} · Використано {product.lessons_used}
                    {purchased > 0 ? ` · Куплено ${purchased}` : ''}
                  </div>
                </div>
                <div className="optimate-dash-balance-progress" style={{ minWidth: 120 }}>
                  <ProgressBar pct={pct} color={accent.color} small />
                </div>
              </div>
            )
          })}
          <Link href="/student/balance" className="btn btn-secondary btn-full" style={{ marginTop: 12, textDecoration: 'none', justifyContent: 'center' }}>
            Детальний баланс і транзакції
          </Link>
        </div>

        <div className="card">
          <div className="card-title">Останні транзакції</div>
          {!overview?.recent_transactions.length && !loading && (
            <p style={{ color: 'var(--tx3)', fontSize: 14 }}>Транзакцій немає</p>
          )}
          {overview?.recent_transactions.map(tx => (
            <div key={tx.id} className="optimate-tx-row optimate-tx-row--compact">
              <div className="optimate-tx-body">
                <div className="optimate-tx-title">{tx.type_label}</div>
                <div className="optimate-tx-sub">{tx.product_name || '—'}</div>
              </div>
              {tx.lesson_count !== 0 && (
                <div style={{ fontSize: 12, fontWeight: 600, color: tx.is_credit ? 'var(--td)' : 'var(--rd)' }}>
                  {tx.is_credit ? '+' : '−'}{Math.abs(tx.lesson_count)} ур.
                </div>
              )}
            </div>
          ))}
          <Link href="/student/balance" className="btn btn-secondary btn-full" style={{ marginTop: 10, textDecoration: 'none', justifyContent: 'center' }}>
            Вся історія
          </Link>
        </div>
      </div>
      <HomeworkStudentModal
        submissionId={hwModalId}
        onClose={() => setHwModalId(null)}
        onUpdated={() => {}}
      />
    </div>
  )
}
