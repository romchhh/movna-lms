'use client'

import { useSessionProfile } from '@/hooks/useSessionProfile'
import { formatTodayLabelUk } from '@/lib/date-labels'
import { greetingFirstName } from '@/lib/greeting-name'

const ROLE_LABELS = {
  student: 'Учень',
  teacher: 'Викладач',
  admin: 'Адмін',
} as const

interface DashboardHeroProps {
  role: keyof typeof ROLE_LABELS
  subtitle?: string
  fallbackName?: string
  actions?: React.ReactNode
  showDate?: boolean
}

export function DashboardHero({
  role,
  subtitle,
  fallbackName = '',
  actions,
  showDate = true,
}: DashboardHeroProps) {
  const { profile } = useSessionProfile()
  const displayName = profile?.full_name?.trim() || fallbackName
  const firstName = greetingFirstName(displayName)

  return (
    <section className={`dash-hero dash-hero--${role}`} aria-label="Головний дашборд">
      <div className="dash-hero-glow" aria-hidden />
      <div className="dash-hero-body">
        <div className="dash-hero-meta">
          {showDate && <span className="dash-hero-date">{formatTodayLabelUk()}</span>}
          <span className="dash-hero-role">{ROLE_LABELS[role]}</span>
        </div>
        <h1 className="dash-hero-title">
          <span className="dash-hero-greeting">Привіт,</span>{' '}
          <span className="dash-hero-name">{firstName || 'друже'}</span>
        </h1>
        {subtitle && <p className="dash-hero-sub">{subtitle}</p>}
      </div>
      {actions && <div className="dash-hero-actions">{actions}</div>}
    </section>
  )
}
