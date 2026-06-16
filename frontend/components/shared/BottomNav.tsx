'use client'

import { MoreNavIcon } from '@/components/shared/NavIcons'
import type { NavItem, SidebarProps } from '@/components/shared/Sidebar'
import { clearSession } from '@/lib/auth'
import { isNavActive, navShortLabel, splitMobileNav } from '@/lib/nav-utils'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface BottomNavProps {
  role: SidebarProps['role']
  userName: string
  userInitials: string
  accentColor: string
  accentBg: string
  sections: SidebarProps['sections']
  tabHrefs: string[]
}

export default function BottomNav({
  role,
  userName,
  userInitials,
  accentColor,
  accentBg,
  sections,
  tabHrefs,
}: BottomNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [moreOpen, setMoreOpen] = useState(false)

  const { tabs, overflow, sections: grouped } = splitMobileNav(sections, tabHrefs)
  const overflowActive = overflow.some(item => isNavActive(pathname, item.href))

  useEffect(() => {
    setMoreOpen(false)
  }, [pathname])

  useEffect(() => {
    document.body.classList.toggle('more-open', moreOpen)
    return () => document.body.classList.remove('more-open')
  }, [moreOpen])

  function logout() {
    setMoreOpen(false)
    clearSession()
    router.push('/auth/login')
  }

  const roleLabels = { student: 'Учень', teacher: 'Викладач', admin: 'Адмін' }

  return (
    <>
      <button
        type="button"
        className={`bottom-nav-overlay${moreOpen ? ' is-visible' : ''}`}
        aria-label="Закрити меню"
        onClick={() => setMoreOpen(false)}
        tabIndex={moreOpen ? 0 : -1}
      />

      <div
        className={`bottom-nav-sheet${moreOpen ? ' is-open' : ''}`}
        role="dialog"
        aria-label="Інше меню"
        style={{ '--accent': accentColor, '--accent-bg': accentBg } as React.CSSProperties}
      >
        <div className="bottom-nav-sheet-head">
          <div className="bottom-nav-sheet-user">
            <div className="avatar" style={{ background: accentBg, color: accentColor }}>
              {userInitials}
            </div>
            <div>
              <div className="bottom-nav-sheet-name">{userName}</div>
              <div className="bottom-nav-sheet-role">{roleLabels[role]}</div>
            </div>
          </div>
          <button
            type="button"
            className="bottom-nav-sheet-close"
            aria-label="Закрити"
            onClick={() => setMoreOpen(false)}
          >
            <svg viewBox="0 0 24 24" aria-hidden>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="bottom-nav-sheet-body">
          {grouped.map(section => {
            const items = section.items.filter(item => !tabHrefs.includes(item.href))
            if (items.length === 0) return null
            return (
              <div key={section.label} className="bottom-nav-sheet-group">
                <div className="bottom-nav-sheet-section">{section.label}</div>
                {items.map(item => (
                  <NavSheetLink
                    key={item.href}
                    item={item}
                    active={isNavActive(pathname, item.href)}
                    onNavigate={() => setMoreOpen(false)}
                  />
                ))}
              </div>
            )
          })}
        </div>

        <button type="button" className="bottom-nav-sheet-logout" onClick={logout}>
          Вийти з акаунту
        </button>
      </div>

      <nav className="bottom-nav" aria-label="Головне меню">
        <div
          className="bottom-nav-inner"
          style={{ '--accent': accentColor, '--accent-bg': accentBg } as React.CSSProperties}
        >
          {tabs.map(item => (
            <BottomNavTab
              key={item.href}
              item={item}
              active={isNavActive(pathname, item.href)}
            />
          ))}

          {overflow.length > 0 && (
            <button
              type="button"
              className={`bottom-nav-item${moreOpen || overflowActive ? ' active' : ''}`}
              onClick={() => setMoreOpen(v => !v)}
              aria-expanded={moreOpen}
              aria-label="Інше меню"
            >
              <span className="bottom-nav-icon">
                <MoreNavIcon />
              </span>
              <span className="bottom-nav-label">Ще</span>
            </button>
          )}
        </div>
      </nav>
    </>
  )
}

function BottomNavTab({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link href={item.href} className={`bottom-nav-item${active ? ' active' : ''}`}>
      <span className="bottom-nav-icon">
        {item.icon}
        {(item.badge ?? 0) > 0 && (
          <span className="bottom-nav-badge">{item.badge! > 9 ? '9+' : item.badge}</span>
        )}
      </span>
      <span className="bottom-nav-label">{navShortLabel(item.label)}</span>
    </Link>
  )
}

function NavSheetLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem
  active: boolean
  onNavigate: () => void
}) {
  return (
    <Link
      href={item.href}
      className={`bottom-nav-sheet-link${active ? ' active' : ''}`}
      onClick={onNavigate}
    >
      <span className="bottom-nav-sheet-link-icon">{item.icon}</span>
      <span className="bottom-nav-sheet-link-label">{item.label}</span>
      {(item.badge ?? 0) > 0 && <span className="nav-badge">{item.badge}</span>}
    </Link>
  )
}
