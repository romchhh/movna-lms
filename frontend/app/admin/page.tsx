'use client'

import { AdminDashboardInsights } from '@/components/admin/AdminDashboardInsights'
import { AdminEventsCalendar } from '@/components/admin/AdminEventsCalendar'
import { AdminOptimateSyncBar } from '@/components/admin/AdminOptimateSyncBar'
import { PendingRequestsAlert } from '@/components/lesson-requests/PendingRequestsAlert'
import { DashboardHero } from '@/components/shared/DashboardHero'
import { Badge, Card, Empty } from '@/components/shared/UI'
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

  const lowBalance = overview?.low_balance_students ?? []

  return (
    <div className="dash-home">
      <DashboardHero
        role="admin"
        fallbackName="Адміністратор"
        subtitle={loading ? 'Завантаження з Optimate…' : `Огляд школи · ${overview?.month_label ?? ''}`}
        actions={<AdminOptimateSyncBar cache={overview?.cache ?? null} onRefreshed={load} />}
      />

      {error && <div className="alert">{error}</div>}
      <PendingRequestsAlert href="/admin/requests" />

      <AdminDashboardInsights overview={overview} loading={loading} />

      <div className="admin-dash-calendar">
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
      </div>

      <Card title="Учні з малим балансом" className="admin-dash-low-balance">
        {loading && <Empty label="Завантаження..." />}
        {!loading && lowBalance.length === 0 && (
          <Empty label="Усі учні мають достатній баланс" />
        )}
        {!loading && lowBalance.length > 0 && (
          <div className="admin-dash-low-balance-grid">
            {lowBalance.map(s => (
              <div key={s.id} className="admin-dash-low-balance-card">
                <div className="admin-dash-low-balance-name">{s.full_name}</div>
                <Badge variant={s.remaining_lessons <= 1 ? 'red' : 'amber'}>
                  {s.remaining_lessons} уроків
                </Badge>
                {s.chat_url ? (
                  <a
                    href={s.chat_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-sm btn-secondary admin-dash-low-balance-action"
                  >
                    Telegram
                  </a>
                ) : (
                  <Link href="/admin/students" className="btn btn-sm btn-secondary admin-dash-low-balance-action">
                    Деталі
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
