'use client'

import { clearSession, homeForRole } from '@/lib/auth'
import { isNavActive } from '@/lib/nav-utils'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { SidebarCollapseIcon } from '@/components/shared/SidebarCollapseIcon'
import { LogoutNavIcon } from '@/components/shared/NavIcons'
import { NavSectionIcon } from '@/components/shared/NavSectionIcon'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

export interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  badge?: number
  badgeAttention?: boolean
}

export interface SidebarProps {
  role: 'student' | 'teacher' | 'admin'
  userName: string
  userInitials: string
  avatarUrl?: string
  accentColor: string
  accentBg: string
  sections: { label: string; items: NavItem[] }[]
  mobileOpen?: boolean
  collapsed?: boolean
  onToggleCollapse?: () => void
  onNavigate?: () => void
}

export default function Sidebar({
  role,
  userName,
  userInitials,
  avatarUrl = '',
  accentColor,
  accentBg,
  sections,
  mobileOpen = false,
  collapsed = false,
  onToggleCollapse,
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
      className={`sidebar${mobileOpen ? ' sidebar-open' : ''}${collapsed ? ' sidebar--collapsed' : ''}`}
      style={
        {
          '--accent': accentColor,
          '--accent-bg': accentBg,
        } as React.CSSProperties
      }
    >
      <div className="sidebar-panel">
        <div className="sidebar-header">
          <div className="sidebar-header-brand">
            <Link
              href={homeHref}
              className="sidebar-logo"
              onClick={onNavigate}
              aria-label="На головну"
              title={collapsed ? 'Movna' : undefined}
            >
              <img
                src="/branding/movna-logo.svg"
                alt="Movna"
                className="brand-logo brand-logo--full"
                width={157}
                height={36}
              />
              <img
                src="/branding/little_logo.svg"
                alt=""
                className="brand-logo brand-logo--compact"
                width={36}
                height={22}
                aria-hidden
              />
            </Link>
            {onToggleCollapse && (
              <button
                type="button"
                className="sidebar-collapse-btn"
                onClick={onToggleCollapse}
                aria-label={collapsed ? 'Розгорнути меню' : 'Згорнути меню'}
                aria-expanded={!collapsed}
                title={collapsed ? 'Розгорнути меню' : 'Згорнути меню'}
              >
                <SidebarCollapseIcon collapsed={collapsed} />
              </button>
            )}
          </div>
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
              <div className="sidebar-section">
                <NavSectionIcon label={section.label} />
                <span>{section.label}</span>
              </div>
              {section.items.map(item => {
                const active = isNavActive(pathname, item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`nav-item${active ? ' active' : ''}`}
                    onClick={onNavigate}
                    title={collapsed ? item.label : undefined}
                  >
                    <span className="nav-icon">
                      {item.icon}
                      {collapsed && (item.badge ?? 0) > 0 && (
                        <span
                          className={`nav-icon-dot${item.badgeAttention ? ' nav-icon-dot--attention' : ''}`}
                          aria-hidden
                        />
                      )}
                    </span>
                    <span className="nav-label">{item.label}</span>
                    {!collapsed && (item.badge ?? 0) > 0 && (
                      <span className={`nav-badge${item.badgeAttention ? ' nav-badge--attention' : ''}`}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-user-row">
            <UserAvatar
              name={userName}
              avatarUrl={avatarUrl}
              size="md"
              kind={role === 'teacher' ? 'teacher' : role === 'student' ? 'student' : 'admin'}
              className="sidebar-avatar-slot"
            />
            <div className="sidebar-user">
              <div className="sidebar-user-name">{userName}</div>
              <div className="sidebar-user-role">{roleLabels[role]}</div>
            </div>
          </div>
          <button type="button" className="sidebar-logout-btn" onClick={logout}>
            <LogoutNavIcon />
            <span>Вийти</span>
          </button>
        </div>
      </div>
    </aside>
  )
}
