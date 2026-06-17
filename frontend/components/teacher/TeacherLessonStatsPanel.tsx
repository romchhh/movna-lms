'use client'

import {
  StatsCalendarIcon,
  StatsClockIcon,
  StatsTrendIcon,
  StatsUsersIcon,
  TeacherStatsKpi,
} from '@/components/teacher/TeacherStatsKpi'
import { FormatBreakdownBar } from '@/components/shared/FormatBreakdownBar'
import { WeekActivityChart } from '@/components/shared/WeekActivityChart'
import { Empty } from '@/components/shared/UI'
import type { TeacherLessonStats } from '@/lib/teacher-optimate-api'

interface TeacherLessonStatsPanelProps {
  stats: TeacherLessonStats | null
  loading?: boolean
  compact?: boolean
}

function fmt(n: number) {
  return n.toLocaleString('uk-UA')
}

export function TeacherLessonStatsPanel({ stats, loading, compact }: TeacherLessonStatsPanelProps) {
  const monthLabel = stats?.month_label ?? '…'
  const changePct = stats?.month_change_pct ?? 0
  const changeLabel =
    changePct === 0
      ? 'як минулий місяць'
      : changePct > 0
        ? 'до минулого місяця'
        : 'до минулого місяця'

  const cancelled = stats?.cancelled_this_month ?? 0

  const body = (
    <div className={`tls-dash${compact ? ' tls-dash--compact' : ''}`}>
      <section className="tls-hero" aria-label="Ключові показники">
        <TeacherStatsKpi
          variant="teal"
          icon={<StatsCalendarIcon />}
          label="Проведено"
          value={loading ? '…' : fmt(stats?.completed_this_month ?? 0)}
          sub={loading ? '' : `${stats?.hours_this_month ?? 0} год навчання`}
          compact={compact}
          loading={loading}
        />
        <TeacherStatsKpi
          variant="purple"
          icon={<StatsCalendarIcon />}
          label="Заплановано на місяць"
          value={loading ? '…' : fmt(stats?.planned_this_month ?? 0)}
          sub={loading ? '' : `${stats?.planned_upcoming ?? 0} майбутніх уроків`}
          compact={compact}
          loading={loading}
        />
        <TeacherStatsKpi
          variant="amber"
          icon={<StatsClockIcon />}
          label="Цей тиждень"
          value={loading ? '…' : fmt(stats?.completed_this_week ?? 0)}
          sub={loading ? '' : `${stats?.planned_this_week ?? 0} заплановано`}
          compact={compact}
          loading={loading}
        />
        <TeacherStatsKpi
          variant="neutral"
          icon={<StatsTrendIcon />}
          label={`За ${stats?.days_back ?? 365} днів`}
          value={loading ? '…' : fmt(stats?.completed_in_period ?? 0)}
          trend={!loading && stats ? { pct: changePct, label: changeLabel } : undefined}
          compact={compact}
          loading={loading}
        />
      </section>

      {!compact && (
        <>
          <section className="tls-bento">
            <div className="tls-panel tls-panel--chart">
              <h3 className="tls-panel-title">Тижнева активність</h3>
              {loading && <Empty label="Завантаження..." />}
              {!loading && stats && stats.week_activity.length > 0 && (
                <WeekActivityChart
                  data={stats.week_activity}
                  caption="Поточний тиждень (Пн–Нд) · зелений — проведено, блакитний — заплановано"
                  doneClassName="tls-week-chart-bar--done"
                  plannedClassName="tls-week-chart-bar--planned"
                />
              )}
              {!loading && (!stats || stats.week_activity.length === 0) && (
                <Empty label="Немає даних за тиждень" />
              )}
            </div>

            <div className="tls-panel tls-panel--formats">
              <h3 className="tls-panel-title">Формати</h3>
              {loading && <Empty label="Завантаження..." />}
              {!loading && stats && (
                <FormatBreakdownBar
                  data={stats.format_breakdown_month}
                  subtitle="Проведені уроки поточного місяця"
                />
              )}
            </div>

            <div className="tls-metrics">
              <TeacherStatsKpi
                label="Сьогодні"
                value={loading ? '…' : fmt(stats?.completed_today ?? 0)}
                sub="проведено"
                compact
                loading={loading}
              />
              <TeacherStatsKpi
                label="Минулий місяць"
                value={loading ? '…' : fmt(stats?.completed_last_month ?? 0)}
                sub="проведено"
                variant="neutral"
                compact
                loading={loading}
              />
              <TeacherStatsKpi
                label="Скасовано"
                value={loading ? '…' : fmt(cancelled)}
                sub="цього місяця"
                variant={cancelled > 0 ? 'red' : 'neutral'}
                highlight={cancelled > 0}
                compact
                loading={loading}
              />
              <TeacherStatsKpi
                label="Заплановано тиждень"
                value={loading ? '…' : fmt(stats?.planned_this_week ?? 0)}
                sub="включно з майбутніми"
                variant="purple"
                compact
                loading={loading}
              />
              <TeacherStatsKpi
                icon={<StatsUsersIcon />}
                label="Унікальних учнів"
                value={loading ? '…' : fmt(stats?.unique_students_month ?? 0)}
                sub="провели урок цього місяця"
                variant="teal"
                compact
                loading={loading}
              />
              <TeacherStatsKpi
                label="Середньо / тиждень"
                value={loading ? '…' : fmt(stats?.avg_lessons_per_week ?? 0)}
                sub="проведених уроків"
                compact
                loading={loading}
              />
              <TeacherStatsKpi
                label="Найактивніший день"
                value={loading ? '…' : (stats?.busiest_weekday_label ?? '—')}
                sub="за проведеними"
                variant="amber"
                compact
                loading={loading}
              />
              <TeacherStatsKpi
                label="Пробні уроки"
                value={loading ? '…' : fmt(stats?.trial_lessons_month ?? 0)}
                sub="цього місяця"
                variant="neutral"
                compact
                loading={loading}
              />
            </div>
          </section>
        </>
      )}

      {compact && !loading && stats && stats.week_activity.length > 0 && (
        <div className="tls-compact-chart">
          <WeekActivityChart
            data={stats.week_activity}
            caption="Поточний тиждень"
            doneClassName="tls-week-chart-bar--done"
            plannedClassName="tls-week-chart-bar--planned"
          />
        </div>
      )}

      {loading && !stats && <Empty label="Завантаження статистики..." />}
    </div>
  )

  if (compact) {
    return <div className="teacher-lesson-stats-compact-wrap">{body}</div>
  }

  return (
    <div className="card tls-card-wrap">
      <div className="tls-card-head">
        <h2 className="tls-card-title">Статистика уроків</h2>
        {!loading && monthLabel !== '…' && (
          <span className="tls-card-month">{monthLabel}</span>
        )}
      </div>
      {body}
    </div>
  )
}
