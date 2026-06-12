'use client'

import { homeForRole } from '@/lib/auth'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar, { type SidebarProps } from './Sidebar'

interface AppShellProps {
  children: React.ReactNode
  sidebar: SidebarProps
}

export default function AppShell({ children, sidebar }: AppShellProps) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  const closeMenu = useCallback(() => setMenuOpen(false), [])

  useEffect(() => {
    closeMenu()
  }, [pathname, closeMenu])

  useEffect(() => {
    document.body.classList.toggle('nav-open', menuOpen)
    return () => document.body.classList.remove('nav-open')
  }, [menuOpen])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeMenu()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeMenu])

  return (
    <div className="app-shell">
      <button
        type="button"
        className={`sidebar-overlay${menuOpen ? ' is-visible' : ''}`}
        aria-label="Закрити меню"
        onClick={closeMenu}
        tabIndex={menuOpen ? 0 : -1}
      />

      <Sidebar
        {...sidebar}
        mobileOpen={menuOpen}
        onNavigate={closeMenu}
      />

      <div className="app-main">
        <header className="mobile-topbar">
          <button
            type="button"
            className={`burger-btn${menuOpen ? ' is-open' : ''}`}
            aria-label={menuOpen ? 'Закрити меню' : 'Відкрити меню'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(v => !v)}
          >
            <span />
            <span />
            <span />
          </button>
          <Link href={homeForRole(sidebar.role)} className="mobile-topbar-logo" aria-label="На головну">
            <img src="/branding/movna-logo.svg" alt="Movna" width={120} height={28} />
          </Link>
        </header>

        <main className="main-content">{children}</main>
      </div>
    </div>
  )
}
