'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SettingsNavIcon } from '@/components/shared/NavIcons'
import { useTeacherMeetingLinksStatus } from '@/hooks/useTeacherMeetingLinksStatus'
import {
  clearMeetingLinksSetupAlertDismiss,
  dismissMeetingLinksSetupAlert,
  isMeetingLinksSetupAlertDismissed,
} from '@/lib/meeting-links-api'
import { useEffect, useState } from 'react'

interface TeacherMeetingLinksAlertProps {
  href?: string
}

export function TeacherMeetingLinksAlert({ href = '/teacher/settings#meeting-links' }: TeacherMeetingLinksAlertProps) {
  const pathname = usePathname()
  const { loading, status } = useTeacherMeetingLinksStatus()
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    setDismissed(isMeetingLinksSetupAlertDismissed())
  }, [])

  useEffect(() => {
    if (status.complete) {
      clearMeetingLinksSetupAlertDismiss()
      setDismissed(false)
    }
  }, [status.complete])

  if (loading || status.complete || dismissed || pathname.startsWith('/teacher/settings')) return null

  const missing = [
    !status.zoomOk ? 'Zoom' : null,
    !status.miroOk ? 'Miro' : null,
  ].filter(Boolean).join(' та ')

  function dismiss() {
    dismissMeetingLinksSetupAlert()
    setDismissed(true)
  }

  return (
    <div className="meeting-links-setup-alert" role="alert">
      <button
        type="button"
        className="meeting-links-setup-alert-close"
        onClick={dismiss}
        aria-label="Закрити"
      >
        <svg viewBox="0 0 24 24" aria-hidden>
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      <span className="meeting-links-setup-alert-text">
        <SettingsNavIcon />
        <span>
          <strong>Заповніть посилання на уроки</strong>
          <span className="meeting-links-setup-alert-sub">
            Учні не зможуть приєднатися до заняття, поки не вказано: {missing}
          </span>
        </span>
      </span>
      <Link href={href} className="btn btn-sm btn-teal">
        Вказати зараз
      </Link>
    </div>
  )
}
