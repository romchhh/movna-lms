'use client'

import { AppSplash } from '@/components/shared/AppSplash'
import { useEffect, useState } from 'react'

/**
 * First-paint splash on white with Movna branding.
 * Hides after hydration so route UI can take over.
 */
export function AppBootSplash() {
  const [visible, setVisible] = useState(true)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    const startExit = window.setTimeout(() => setExiting(true), 420)
    const hide = window.setTimeout(() => setVisible(false), 780)
    return () => {
      window.clearTimeout(startExit)
      window.clearTimeout(hide)
    }
  }, [])

  if (!visible) return null

  return (
    <div className={`movna-boot${exiting ? ' movna-boot--out' : ''}`} aria-hidden={exiting}>
      <AppSplash label="MOVNA LMS" />
    </div>
  )
}
