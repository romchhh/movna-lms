'use client'

import {
  AdminKpiCard,
  AlertKpiIcon,
  LessonsKpiIcon,
  StudentsKpiIcon,
  TeachersKpiIcon,
} from '@/components/admin/AdminKpiCard'
import { FormatBreakdownBar } from '@/components/shared/FormatBreakdownBar'
import { WeekActivityChart } from '@/components/shared/WeekActivityChart'
import { Badge, Card, Empty } from '@/components/shared/UI'
import type { AdminOverview } from '@/lib/admin-optimate-api'
import Link from 'next/link'

interface AdminDashboardInsightsProps {
  overview: AdminOverview | null
  loading?: boolean
}

function fmt(n: number) {
  return n.toLocaleString('uk-UA')
}

export function AdminDashboardInsights({ overview, loading }: AdminDashboardInsightsProps) {
  const studentsTotal = overview?.students_total ?? 0
  const activeStudents = overview?.active_students ?? 0
  const activePct = studentsTotal > 0 ? Math.round((activeStudents / studentsTotal) * 100) : 0

  const eventsToday = overview?.events_today ?? 0
  const completedToday = overview?.completed_today ?? 0
  const todayDonePct = eventsToday > 0 ? Math.round((completedToday / eventsToday) * 100) : 0

  const pendingRequests = overview?.pending_requests ?? 0
  const lowBalance = overview?.low_balance_count ?? 0
  const unmarked = overview?.unmarked_lessons ?? 0
  const cancelled = overview?.cancelled_this_month ?? 0
  const attentionCount = pendingRequests + lowBalance + unmarked

  return (
    <div className="admin-dash">
      <section className="admin-dash-hero" aria-label="Ключові показники">
        <AdminKpiCard
          variant="purple"
          icon={<StudentsKpiIcon />}
          label="Учні"
          value={loading ? '…' : fmt(studentsTotal)}
          sub={loading ? '' : `${fmt(activeStudents)} активних · ${overview?.new_students ?? 0} нових`}
          progress={activePct}
          progressLabel={`${activePct}% активні`}
          href="/admin/students"
          loading={loading}
        />
        <AdminKpiCard
          variant="teal"
          icon={<LessonsKpiIcon />}
          label={`Уроки · ${overview?.month_label ?? 'місяць'}`}
          value={loading ? '…' : fmt(overview?.completed_this_month ?? 0)}
          sub={
            loading
              ? ''
              : `${fmt(overview?.planned_this_month ?? 0)} заплановано · ${overview?.hours_completed_month ?? 0} год`
          }
          href="/admin/events"
          loading={loading}
        />
        <AdminKpiCard
          variant="amber"
          icon={<LessonsKpiIcon />}
          label="Сьогодні"
          value={loading ? '…' : fmt(eventsToday)}
          sub={loading ? '' : `${fmt(completedToday)} проведено · ${fmt(overview?.events_week ?? 0)} за тиждень`}
          progress={todayDonePct}
          progressLabel={eventsToday > 0 ? `${todayDonePct}% проведено` : 'немає подій'}
          loading={loading}
        />
        <AdminKpiCard
          variant="neutral"
          icon={<TeachersKpiIcon />}
          label="Викладачі"
          value={loading ? '…' : fmt(overview?.teachers_total ?? 0)}
          sub={loading ? '' : `${overview?.paused_students ?? 0} учнів на паузі`}
          href="/admin/teachers"
          loading={loading}
        />
      </section>

      {!loading && attentionCount > 0 && (
        <section className="admin-dash-attention" aria-label="Потребує уваги">
          <div className="admin-dash-attention-head">
            <AlertKpiIcon />
            <span>Потребує уваги</span>
            <Badge variant="red">{attentionCount}</Badge>
          </div>
          <div className="admin-dash-attention-chips">
            {pendingRequests > 0 && (
              <Link href="/admin/requests" className="admin-dash-chip admin-dash-chip--amber">
                <strong>{pendingRequests}</strong>
                <span>запит{pendingRequests === 1 ? '' : pendingRequests < 5 ? 'и' : 'ів'} LMS</span>
              </Link>
            )}
            {lowBalance > 0 && (
              <Link href="/admin/students" className="admin-dash-chip admin-dash-chip--red">
                <strong>{lowBalance}</strong>
                <span>малий баланс</span>
              </Link>
            )}
            {unmarked > 0 && (
              <Link href="/admin/teachers" className="admin-dash-chip admin-dash-chip--purple">
                <strong>{unmarked}</strong>
                <span>неперевірених уроків</span>
              </Link>
            )}
          </div>
        </section>
      )}

      <section className="admin-dash-bento">
        <Card title="Активність за тиждень" className="admin-dash-panel admin-dash-panel--chart">
          {loading && <Empty label="Завантаження..." />}
          {!loading && overview && (
            <WeekActivityChart
              data={overview.week_activity.map(a => ({
                day: a.day,
                label: a.label,
                total: a.count,
                completed: a.completed,
                planned: a.planned,
              }))}
              caption="Останні 7 днів · зелений — проведено, фіолетовий — заплановано"
              doneClassName="admin-week-chart-bar--done"
              plannedClassName="admin-week-chart-bar--planned"
            />
          )}
        </Card>

        <Card title={`Формати · ${overview?.month_label ?? ''}`} className="admin-dash-panel admin-dash-panel--formats">
          {loading && <Empty label="Завантаження..." />}
          {!loading && overview && (
            <FormatBreakdownBar
              data={overview.format_breakdown}
              subtitle="Проведені уроки поточного місяця"
            />
          )}
        </Card>

        <div className="admin-dash-metrics">
          <AdminKpiCard
            variant="teal"
            label="Проведено сьогодні"
            value={loading ? '…' : fmt(completedToday)}
            sub="уроків"
            loading={loading}
          />
          <AdminKpiCard
            variant={cancelled > 0 ? 'red' : 'neutral'}
            label="Скасовано"
            value={loading ? '…' : fmt(cancelled)}
            sub="цього місяця"
            highlight={cancelled > 0}
            loading={loading}
          />
          <AdminKpiCard
            variant="purple"
            label="Заплановано"
            value={loading ? '…' : fmt(overview?.planned_this_month ?? 0)}
            sub="на місяць"
            loading={loading}
          />
          <AdminKpiCard
            variant={pendingRequests > 0 ? 'amber' : 'neutral'}
            label="Запити LMS"
            value={loading ? '…' : pendingRequests}
            sub="очікують рішення"
            href="/admin/requests"
            highlight={pendingRequests > 0}
            loading={loading}
          />
          <AdminKpiCard
            variant={lowBalance > 0 ? 'red' : 'neutral'}
            label="Малий баланс"
            value={loading ? '…' : lowBalance}
            sub="учнів ≤ 3 уроків"
            href="/admin/students"
            highlight={lowBalance > 0}
            loading={loading}
          />
          <AdminKpiCard
            variant={unmarked > 0 ? 'amber' : 'neutral'}
            label="Неперевірені"
            value={loading ? '…' : unmarked}
            sub="уроків у CRM"
            href="/admin/teachers"
            highlight={unmarked > 0}
            loading={loading}
          />
        </div>
      </section>

      <section className="admin-dash-rankings g2 dash-grid">
        <Card title={`Топ викладачів · ${overview?.month_label ?? ''}`} className="admin-dash-rank-card">
          {loading && <Empty label="Завантаження..." />}
          {!loading && (overview?.top_teachers_month.length ?? 0) === 0 && (
            <Empty label="Ще немає проведених уроків" />
          )}
          {!loading && (overview?.top_teachers_month ?? []).map((t, i) => {
            const maxLessons = overview?.top_teachers_month[0]?.lessons ?? 1
            const barPct = Math.round((t.lessons / maxLessons) * 100)
            return (
              <div key={t.id} className="admin-dash-rank-row">
                <span className={`admin-dash-rank-pos${i < 3 ? ` admin-dash-rank-pos--${i + 1}` : ''}`}>
                  {i + 1}
                </span>
                <div className="admin-dash-rank-body">
                  <div className="admin-table-title">{t.full_name}</div>
                  <div className="admin-dash-rank-bar">
                    <div className="admin-dash-rank-bar-fill" style={{ width: `${barPct}%` }} />
                  </div>
                </div>
                <span className="admin-dash-rank-value">{t.lessons}</span>
              </div>
            )
          })}
          {!loading && (
            <Link href="/admin/teachers" className="btn btn-secondary btn-sm btn-full admin-dash-rank-link">
              Усі викладачі →
            </Link>
          )}
        </Card>

        <Card title="Неперевірені уроки по викладачах" className="admin-dash-rank-card">
          {loading && <Empty label="Завантаження..." />}
          {!loading && (overview?.teacher_load.length ?? 0) === 0 && <Empty label="Немає даних" />}
          {(overview?.teacher_load ?? []).map(t => {
            const count = t.unmarked_lesson_count ?? 0
            const maxUnmarked = Math.max(...(overview?.teacher_load ?? []).map(x => x.unmarked_lesson_count ?? 0), 1)
            return (
              <div key={t.id} className="admin-dash-rank-row">
                <div className="admin-teacher-avatar admin-dash-rank-avatar">
                  {t.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="admin-dash-rank-body">
                  <div className="admin-table-title">{t.full_name}</div>
                  <div className="admin-table-sub">{t.students_count ?? 0} учнів</div>
                  {count > 0 && (
                    <div className="admin-dash-rank-bar admin-dash-rank-bar--warn">
                      <div
                        className="admin-dash-rank-bar-fill"
                        style={{ width: `${Math.round((count / maxUnmarked) * 100)}%` }}
                      />
                    </div>
                  )}
                </div>
                {count > 0 ? (
                  <Badge variant="red">{count}</Badge>
                ) : (
                  <Badge variant="green">OK</Badge>
                )}
              </div>
            )
          })}
        </Card>
      </section>
    </div>
  )
}
