'use client'

import { AdminEventsCalendar } from '@/components/admin/AdminEventsCalendar'
import { AdminOptimateSyncBar } from '@/components/admin/AdminOptimateSyncBar'
import { StatCard, Card, Badge, PageHeader, Empty } from '@/components/shared/UI'
import { AdminOverview, adminOptimateApi } from '@/lib/admin-optimate-api'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

export default function AdminDashboard() {
  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const ov = await adminOptimateApi.overview()
      setOverview(ov)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const maxVal = Math.max(...(overview?.week_activity.map(a => a.count) ?? [1]), 1)

  return (
    <>
      <PageHeader
        title="Адмін-панель"
        sub={loading ? 'Завантаження з Optimate...' : 'Актуальні дані школи MOVNA'}
      />

      {error && <div className="alert">{error}</div>}
      <AdminOptimateSyncBar cache={overview?.cache ?? null} onRefreshed={load} />

      <div className="g4 dash-stats">
        <StatCard
          label="Всього учнів"
          value={overview?.students_total ?? '—'}
          sub="в Optimate"
        />
        <StatCard
          label="Викладачів"
          value={overview?.teachers_total ?? '—'}
          sub="активних у CRM"
        />
        <StatCard
          label="Уроків сьогодні"
          value={overview?.events_today ?? '—'}
          sub={`${overview?.events_week ?? 0} за тиждень`}
        />
        <StatCard
          label="Непроверених"
          value={overview?.unmarked_lessons ?? '—'}
          danger={(overview?.unmarked_lessons ?? 0) > 0}
          sub="уроків у CRM"
        />
      </div>

      <div className="g2">
        <Card title="Уроки цього тижня">
          {loading && <Empty label="Завантаження..." />}
          {!loading && (
            <>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 100, marginBottom: 6 }}>
                {(overview?.week_activity ?? []).map((a, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ fontSize: 10, color: 'var(--tx3)' }}>{a.count}</div>
                    <div style={{ width: '100%', background: 'var(--rl)', borderRadius: '3px 3px 0 0', height: 70, position: 'relative' }}>
                      <div style={{
                        position: 'absolute', bottom: 0, width: '100%',
                        background: 'var(--r)', borderRadius: '3px 3px 0 0',
                        height: `${(a.count / maxVal) * 100}%`,
                        transition: 'height .3s',
                      }} />
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--tx3)' }}>{a.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: 'var(--tx2)', textAlign: 'center' }}>
                Заплановані та проведені уроки за 7 днів
              </div>
            </>
          )}
        </Card>

        <Card title="Завантаженість викладачів">
          {loading && <Empty label="Завантаження..." />}
          {!loading && (overview?.teacher_load.length ?? 0) === 0 && <Empty label="Немає даних" />}
          {(overview?.teacher_load ?? []).map(t => (
            <div key={t.id} style={{ padding: '9px 0', borderBottom: '.5px solid var(--bd)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--tl)', color: 'var(--td)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 500, flexShrink: 0 }}>
                {t.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx)' }}>{t.full_name}</div>
                <div style={{ fontSize: 11, color: 'var(--tx2)', marginTop: 1 }}>
                  {t.students_count ?? 0} учнів
                </div>
              </div>
              {(t.unmarked_lesson_count ?? 0) > 0 && (
                <Badge variant="red">{t.unmarked_lesson_count} неперев.</Badge>
              )}
            </div>
          ))}
        </Card>
      </div>

      <Card title="Календар уроків">
        <AdminEventsCalendar
          embed
          showSyncBar={false}
          defaultRange="month"
          showRangeFilters
          defaultView="week"
        />
        <div style={{ marginTop: 12 }}>
          <Link href="/admin/events" className="btn btn-secondary btn-sm">Усі події →</Link>
        </div>
      </Card>

      <Card title="Учні з малим балансом">
        {loading && <Empty label="Завантаження..." />}
        {!loading && (overview?.low_balance_students.length ?? 0) === 0 && (
          <Empty label="Усі учні мають достатній баланс" />
        )}
        {(overview?.low_balance_students ?? []).map(s => (
          <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 140px', gap: 8, alignItems: 'center', padding: '9px 0', borderBottom: '.5px solid var(--bd)' }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx)' }}>{s.full_name}</span>
            <div style={{ textAlign: 'center' }}>
              <Badge variant={s.remaining_lessons <= 1 ? 'red' : 'amber'}>{s.remaining_lessons} уроків</Badge>
            </div>
            {s.chat_url ? (
              <a href={s.chat_url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-secondary" style={{ fontSize: 11 }}>
                Telegram
              </a>
            ) : (
              <Link href="/admin/students" className="btn btn-sm btn-secondary" style={{ fontSize: 11 }}>
                Деталі
              </Link>
            )}
          </div>
        ))}
      </Card>
    </>
  )
}
