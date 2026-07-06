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
import { useMemo } from 'react'

interface TeacherLessonStatsPanelProps {
  stats: TeacherLessonStats | null
  loading?: boolean
  compact?: boolean
  /** Full-width hero KPIs on teacher dashboard */
  prominent?: boolean
  selectedYear?: number
  selectedMonth?: number
  onMonthChange?: (year: number, month: number) => void
}

const UK_MONTHS = [
  'січень', 'лютий', 'березень', 'квітень', 'травень', 'червень',
  'липень', 'серпень', 'вересень', 'жовтень', 'листопад', 'грудень',
]

function fmt(n: number) {
  return n.toLocaleString('uk-UA')
}

function recentMonthOptions(count = 12) {
  const now = new Date()
  const options: { year: number; month: number; label: string }[] = []
  for (let i = 0; i < count; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    options.push({
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      label: `${UK_MONTHS[d.getMonth()]} ${d.getFullYear()}`,
    })
  }
  return options
}

export function TeacherLessonStatsPanel({
  stats,
  loading,
  compact,
  prominent,
  selectedYear,
  selectedMonth,
  onMonthChange,
}: TeacherLessonStatsPanelProps) {
  const monthLabel = stats?.month_label ?? '…'
  const changePct = stats?.month_change_pct ?? 0
  const changeLabel =
    changePct === 0
      ? 'до попереднього місяця'
      : changePct > 0
        ? 'до попереднього місяця'
        : 'до попереднього місяця'

  const cancelled = stats?.cancelled_this_month ?? 0
  const isCurrentMonth = stats?.is_current_month ?? true
  const monthOptions = useMemo(() => recentMonthOptions(12), [])

  const activeYear = selectedYear ?? stats?.stats_year ?? new Date().getFullYear()
  const activeMonth = selectedMonth ?? stats?.stats_month ?? new Date().getMonth() + 1

  const weekCaption = isCurrentMonth
    ? 'Поточний тиждень (Пн–Нд) · зелений — проведено, блакитний — заплановано'
    : 'Останній тиждень обраного місяця · зелений — проведено, блакитний — заплановано'

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
          label={isCurrentMonth ? 'Заплановано на місяць' : 'Заплановано в місяці'}
          value={loading ? '…' : fmt(stats?.planned_this_month ?? 0)}
          sub={loading ? '' : (isCurrentMonth ? `${stats?.planned_upcoming ?? 0} майбутніх уроків` : 'уроків у календарі')}
          compact={compact}
          loading={loading}
        />
        <TeacherStatsKpi
          variant="amber"
          icon={<StatsClockIcon />}
          label={isCurrentMonth ? 'Цей тиждень' : 'Останній тиждень'}
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
                  caption={weekCaption}
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
                  subtitle={`Проведені уроки · ${monthLabel}`}
                />
              )}
            </div>

            <div className="tls-metrics">
              {isCurrentMonth && (
                <TeacherStatsKpi
                  label="Сьогодні"
                  value={loading ? '…' : fmt(stats?.completed_today ?? 0)}
                  sub="проведено"
                  compact
                  loading={loading}
                />
              )}
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
                sub={isCurrentMonth ? 'цього місяця' : monthLabel}
                variant={cancelled > 0 ? 'red' : 'neutral'}
                highlight={cancelled > 0}
                compact
                loading={loading}
              />
              <TeacherStatsKpi
                label={isCurrentMonth ? 'Заплановано тиждень' : 'Заплановано (тиждень)'}
                value={loading ? '…' : fmt(stats?.planned_this_week ?? 0)}
                sub={isCurrentMonth ? 'включно з майбутніми' : 'в обраному місяці'}
                variant="purple"
                compact
                loading={loading}
              />
              <TeacherStatsKpi
                icon={<StatsUsersIcon />}
                label="Унікальних учнів"
                value={loading ? '…' : fmt(stats?.unique_students_month ?? 0)}
                sub="індив./група/пара (без Speaking Club)"
                variant="teal"
                compact
                loading={loading}
              />
              {(stats?.unique_students_speaking_club_month ?? 0) > 0 && (
                <TeacherStatsKpi
                  icon={<StatsUsersIcon />}
                  label="Speaking Club"
                  value={loading ? '…' : fmt(stats?.unique_students_speaking_club_month ?? 0)}
                  sub="окремо від основних уроків"
                  variant="neutral"
                  compact
                  loading={loading}
                />
              )}
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
                sub={monthLabel}
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
            caption={isCurrentMonth ? 'Поточний тиждень' : 'Останній тиждень місяця'}
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
    <div className={`card tls-card-wrap${prominent ? ' tls-card-wrap--prominent' : ''}`}>
      <div className="tls-card-head">
        <h2 className="tls-card-title">Статистика уроків</h2>
        <div className="tls-card-head-actions" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {onMonthChange && (
            <select
              className="input input-sm"
              value={`${activeYear}-${activeMonth}`}
              onChange={e => {
                const [y, m] = e.target.value.split('-').map(Number)
                onMonthChange(y, m)
              }}
              aria-label="Обрати місяць"
              style={{ minWidth: 160 }}
            >
              {monthOptions.map(opt => (
                <option key={`${opt.year}-${opt.month}`} value={`${opt.year}-${opt.month}`}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}
          {!loading && monthLabel !== '…' && (
            <span className="tls-card-month">{monthLabel}</span>
          )}
        </div>
      </div>
      {body}
    </div>
  )
}
