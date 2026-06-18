'use client'

import { homeForRole } from '@/lib/auth'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import BottomNav from './BottomNav'
import Sidebar, { type SidebarProps } from './Sidebar'
import { WelcomeGreeting } from './WelcomeGreeting'

const SIDEBAR_COLLAPSED_KEY = 'movna-sidebar-collapsed'
const DASHBOARD_PATHS = new Set(['/student', '/teacher', '/admin'])

interface AppShellProps {
  children: React.ReactNode
  sidebar: SidebarProps & { mobileTabHrefs?: string[] }
}

export default function AppShell({ children, sidebar }: AppShellProps) {
  const { mobileTabHrefs, ...sidebarProps } = sidebar
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const isDashboardHome = DASHBOARD_PATHS.has(pathname)

  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
    if (stored === '1') setCollapsed(true)
    setHydrated(true)
  }, [])

  const toggleCollapse = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0')
      return next
    })
  }, [])

  const shellClass = [
    'app-shell',
    collapsed && hydrated ? 'sidebar-collapsed' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={shellClass}>
      <Sidebar
        {...sidebarProps}
        collapsed={collapsed && hydrated}
        onToggleCollapse={toggleCollapse}
      />

      <div
        className="app-main"
        style={
          {
            '--accent': sidebarProps.accentColor,
            '--accent-bg': sidebarProps.accentBg,
          } as React.CSSProperties
        }
      >
        <header className="mobile-topbar">
          <Link href={homeForRole(sidebarProps.role)} className="mobile-topbar-logo" aria-label="На головну">
            <img src="/branding/movna-logo.svg" alt="Movna" width={120} height={28} />
          </Link>
          <div id="mobile-topbar-actions" className="mobile-topbar-actions" />
        </header>

        <main className="main-content">
          {!isDashboardHome && <WelcomeGreeting name={sidebarProps.userName} />}
          {children}
        </main>
      </div>

      {mobileTabHrefs && mobileTabHrefs.length > 0 && (
        <BottomNav
          role={sidebarProps.role}
          userName={sidebarProps.userName}
          userInitials={sidebarProps.userInitials}
          avatarUrl={sidebarProps.avatarUrl}
          accentColor={sidebarProps.accentColor}
          accentBg={sidebarProps.accentBg}
          sections={sidebarProps.sections}
          tabHrefs={mobileTabHrefs}
        />
      )}
    </div>
  )
}
