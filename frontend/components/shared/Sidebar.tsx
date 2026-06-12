'use client'

import { clearSession, homeForRole } from '@/lib/auth'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

export interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  badge?: number
}

export interface SidebarProps {
  role: 'student' | 'teacher' | 'admin'
  userName: string
  userInitials: string
  accentColor: string
  accentBg: string
  sections: { label: string; items: NavItem[] }[]
  mobileOpen?: boolean
  onNavigate?: () => void
}

function isActive(pathname: string, href: string) {
  if (href === '/student' || href === '/teacher' || href === '/admin') {
    return pathname === href
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function Sidebar({
  role,
  userName,
  userInitials,
  accentColor,
  accentBg,
  sections,
  mobileOpen = false,
  onNavigate,
}: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  function logout() {
    clearSession()
    onNavigate?.()
    router.push('/auth/login')
  }

  const roleLabels = { student: 'Учень', teacher: 'Викладач', admin: 'Адмін' }
  const homeHref = homeForRole(role)

  return (
    <aside
      className={`sidebar${mobileOpen ? ' sidebar-open' : ''}`}
      style={
        {
          '--accent': accentColor,
          '--accent-bg': accentBg,
        } as React.CSSProperties
      }
    >
      <div className="sidebar-header">
        <Link href={homeHref} className="sidebar-logo" onClick={onNavigate} aria-label="На головну">
          <img
            src="/branding/movna-logo.svg"
            alt="Movna"
            className="brand-logo"
            width={157}
            height={36}
          />
        </Link>
        <button
          type="button"
          className="sidebar-close"
          aria-label="Закрити меню"
          onClick={onNavigate}
        >
          <svg viewBox="0 0 24 24" aria-hidden>
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <nav className="sidebar-nav">
        {sections.map(section => (
          <div key={section.label} className="sidebar-group">
            <div className="sidebar-section">{section.label}</div>
            {section.items.map(item => {
              const active = isActive(pathname, item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-item${active ? ' active' : ''}`}
                  onClick={onNavigate}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                  {(item.badge ?? 0) > 0 && (
                    <span className="nav-badge">{item.badge}</span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="avatar sidebar-avatar" style={{ background: accentBg, color: accentColor }}>
          {userInitials}
        </div>
        <div className="sidebar-user">
          <div className="sidebar-user-name">{userName}</div>
          <div className="sidebar-user-role">{roleLabels[role]}</div>
        </div>
        <button type="button" className="sidebar-logout" onClick={logout}>
          Вийти
        </button>
      </div>
    </aside>
  )
}
