'use client'

import { EventsCalendar } from '@/components/calendar/EventsCalendar'
import { Badge, ProgressBar } from '@/components/shared/UI'
import { toCalendarEvent } from '@/lib/calendar-types'
import {
  PRODUCT_ACCENT,
  StudentOverview,
  formatEventTimeRange,
  isEventActive,
  optimateApi,
} from '@/lib/optimate-api'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'

export default function StudentDashboard() {
  const [overview, setOverview] = useState<StudentOverview | null>(null)
  const [scheduleEvents, setScheduleEvents] = useState<ReturnType<typeof toCalendarEvent>[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [ov, ev] = await Promise.all([
        optimateApi.overview(),
        optimateApi.events(7, 21),
      ])
      setOverview(ov)
      setScheduleEvents(ev.data.map(e => toCalendarEvent({
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

  return (
    <>
      <div className="page-header">
        <div className="page-header-text">
          <h2>Дашборд</h2>
          <p>
            {loading
              ? 'Завантаження даних з Optimate...'
              : 'Ваші баланси та найближчі заняття'}
          </p>
        </div>
      </div>

      <div className="g4 dash-stats">
        <div className="stat-card">
          <div className="stat-label">Залишок уроків</div>
          <div className="stat-value">{loading ? '…' : totalRemaining}</div>
          <div className="stat-sub">по всіх продуктах</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Продуктів</div>
          <div className="stat-value">{loading ? '…' : overview?.balances.length ?? 0}</div>
          <div className="stat-sub">активних балансів</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Найближче заняття</div>
          <div className="stat-value" style={{ fontSize: nextEvent ? 22 : 32 }}>
            {loading ? '…' : nextEvent
              ? new Intl.DateTimeFormat('uk-UA', { day: '2-digit', month: '2-digit' }).format(new Date(nextEvent.starts_at))
              : '—'}
          </div>
          <div className="stat-sub">
            {nextEvent ? formatEventTimeRange(nextEvent.starts_at, nextEvent.ends_at) : 'немає в календарі'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Транзакції</div>
          <div className="stat-value">{loading ? '…' : overview?.recent_transactions.length ?? 0}</div>
          <div className="stat-sub">останніх операцій</div>
        </div>
      </div>

      <div className="g2">
        <div className="card">
          <div className="card-title">Баланси з Optimate</div>
          {!loading && (!overview || overview.balances.length === 0) && (
            <p style={{ color: 'var(--tx3)', fontSize: 14 }}>Баланси не знайдено</p>
          )}
          {overview?.balances.map(product => {
            const accent = PRODUCT_ACCENT[product.product_type] ?? PRODUCT_ACCENT[1]
            const pct = product.lessons_total > 0
              ? (product.lessons_remaining / product.lessons_total) * 100
              : 0
            return (
              <div key={product.product_id || product.product_name} className="optimate-dash-balance-row">
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{product.product_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--tx2)', marginTop: 2 }}>
                    <Badge variant={accent.badge}>{product.product_type_label}</Badge>
                    {' '}{product.lessons_remaining} з {product.lessons_total} залишилось
                  </div>
                </div>
                <div style={{ minWidth: 120 }}>
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
          <div className="card-title">Календар занять</div>
          <EventsCalendar
            events={calendarEvents}
            loading={loading}
            emptyLabel="Занять не знайдено"
            defaultView="week"
            embed
          />
          <Link
            href="/student/schedule"
            className="btn btn-secondary btn-full"
            style={{ marginTop: 12, textDecoration: 'none', justifyContent: 'center' }}
          >
            Повний розклад
          </Link>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card">
            <div className="card-title">Наступне заняття</div>
            {!nextEvent && !loading && (
              <p style={{ color: 'var(--tx3)', fontSize: 14 }}>Найближчих занять немає</p>
            )}
            {nextEvent && (
              <>
                <div
                  className="schedule-slot"
                  style={{
                    borderLeftColor: (PRODUCT_ACCENT[nextEvent.product_type ?? 2] ?? PRODUCT_ACCENT[2]).color,
                    marginBottom: 10,
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    {nextEvent.product_name || nextEvent.product_type_label}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--tx2)', marginTop: 4 }}>
                    {formatEventTimeRange(nextEvent.starts_at, nextEvent.ends_at)}
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
      </div>
    </>
  )
}
