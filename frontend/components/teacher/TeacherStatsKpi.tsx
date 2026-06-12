'use client'

type KpiVariant = 'teal' | 'purple' | 'amber' | 'red' | 'neutral'

interface TeacherStatsKpiProps {
  label: string
  value: string | number
  sub?: React.ReactNode
  variant?: KpiVariant
  icon?: React.ReactNode
  trend?: { pct: number; label?: string }
  highlight?: boolean
  loading?: boolean
  compact?: boolean
}

const variantClass: Record<KpiVariant, string> = {
  teal: 'tls-kpi--teal',
  purple: 'tls-kpi--purple',
  amber: 'tls-kpi--amber',
  red: 'tls-kpi--red',
  neutral: 'tls-kpi--neutral',
}

export function TeacherStatsKpi({
  label,
  value,
  sub,
  variant = 'teal',
  icon,
  trend,
  highlight,
  loading,
  compact,
}: TeacherStatsKpiProps) {
  return (
    <div
      className={`tls-kpi ${variantClass[variant]}${highlight ? ' tls-kpi--highlight' : ''}${compact ? ' tls-kpi--compact' : ''}`}
    >
      <div className="tls-kpi-top">
        {icon && <div className="tls-kpi-icon" aria-hidden>{icon}</div>}
        <div className="tls-kpi-label">{label}</div>
        {trend && !loading && trend.pct !== 0 && (
          <span className={`tls-trend ${trend.pct > 0 ? 'tls-trend--up' : 'tls-trend--down'}`}>
            {trend.pct > 0 ? '↑' : '↓'} {Math.abs(trend.pct)}%
          </span>
        )}
      </div>
      <div className="tls-kpi-value">{loading ? '…' : value}</div>
      {sub && <div className="tls-kpi-sub">{sub}</div>}
      {trend?.label && !loading && <div className="tls-kpi-trend-label">{trend.label}</div>}
    </div>
  )
}

export function StatsCalendarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  )
}

export function StatsTrendIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  )
}

export function StatsUsersIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

export function StatsClockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}
