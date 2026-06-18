'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SettingsNavIcon } from '@/components/shared/NavIcons'
import { useTeacherMeetingLinksStatus } from '@/hooks/useTeacherMeetingLinksStatus'

interface TeacherMeetingLinksAlertProps {
  href?: string
}

export function TeacherMeetingLinksAlert({ href = '/teacher/settings#meeting-links' }: TeacherMeetingLinksAlertProps) {
  const pathname = usePathname()
  const { loading, status } = useTeacherMeetingLinksStatus()

  if (loading || status.complete || pathname.startsWith('/teacher/settings')) return null

  const missing = [
    !status.zoomOk ? 'Zoom' : null,
    !status.miroOk ? 'Miro' : null,
  ].filter(Boolean).join(' та ')

  return (
    <div className="meeting-links-setup-alert" role="alert">
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
