'use client'

import Link from 'next/link'

type KpiVariant = 'purple' | 'teal' | 'amber' | 'red' | 'neutral'

interface AdminKpiCardProps {
  label: string
  value: string | number
  sub?: React.ReactNode
  variant?: KpiVariant
  icon?: React.ReactNode
  progress?: number
  progressLabel?: string
  href?: string
  highlight?: boolean
  loading?: boolean
}

const variantClass: Record<KpiVariant, string> = {
  purple: 'admin-kpi--purple',
  teal: 'admin-kpi--teal',
  amber: 'admin-kpi--amber',
  red: 'admin-kpi--red',
  neutral: 'admin-kpi--neutral',
}

export function AdminKpiCard({
  label,
  value,
  sub,
  variant = 'neutral',
  icon,
  progress,
  progressLabel,
  href,
  highlight,
  loading,
}: AdminKpiCardProps) {
  const body = (
    <div className={`admin-kpi ${variantClass[variant]}${highlight ? ' admin-kpi--highlight' : ''}`}>
      <div className="admin-kpi-top">
        {icon && <div className="admin-kpi-icon" aria-hidden>{icon}</div>}
        <div className="admin-kpi-label">{label}</div>
      </div>
      <div className="admin-kpi-value">{loading ? '…' : value}</div>
      {sub && <div className="admin-kpi-sub">{sub}</div>}
      {typeof progress === 'number' && !loading && (
        <div className="admin-kpi-progress">
          <div className="admin-kpi-progress-track">
            <div className="admin-kpi-progress-fill" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
          </div>
          {progressLabel && <span className="admin-kpi-progress-label">{progressLabel}</span>}
        </div>
      )}
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="admin-kpi-link">
        {body}
      </Link>
    )
  }

  return body
}

export function StudentsKpiIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

export function LessonsKpiIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  )
}

export function AlertKpiIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

export function TeachersKpiIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}
