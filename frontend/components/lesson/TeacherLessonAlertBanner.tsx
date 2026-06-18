'use client'

import { MiroEmbedModal } from '@/components/lesson/MiroEmbedModal'
import { Badge } from '@/components/shared/UI'
import { PersonInline } from '@/components/shared/UserAvatar'
import { useTeacherNotificationPreferences } from '@/hooks/useTeacherNotificationPreferences'
import { formatTimeRange } from '@/lib/calendar-utils'
import {
  dismissLessonAlert,
  isLessonAlertDismissed,
  lessonAlertPhaseLabel,
  teacherLessonAlertApi,
  type LessonAlert,
} from '@/lib/meeting-links-api'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

export function TeacherLessonAlertBanner() {
  const { notify_lesson_reminder, loading: prefsLoading } = useTeacherNotificationPreferences()
  const [alert, setAlert] = useState<LessonAlert | null>(null)
  const [visible, setVisible] = useState(false)
  const [miroOpen, setMiroOpen] = useState(false)

  const load = useCallback(async () => {
    if (prefsLoading || !notify_lesson_reminder) {
      setAlert(null)
      setVisible(false)
      return
    }
    try {
      const data = await teacherLessonAlertApi.get()
      if (!data.show || !data.event_id || !data.phase) {
        setAlert(null)
        setVisible(false)
        return
      }
      if (isLessonAlertDismissed(data.event_id, data.phase)) {
        setAlert(null)
        setVisible(false)
        return
      }
      setAlert(data)
      setVisible(true)
    } catch {
      setAlert(null)
      setVisible(false)
    }
  }, [notify_lesson_reminder, prefsLoading])

  useEffect(() => {
    load()
    const timer = window.setInterval(load, 60_000)
    return () => window.clearInterval(timer)
  }, [load])

  function dismiss() {
    if (alert?.event_id && alert.phase) {
      dismissLessonAlert(alert.event_id, alert.phase)
    }
    setVisible(false)
  }

  if (!visible || !alert) return null

  const hasZoom = Boolean(alert.zoom_url?.trim())
  const hasMiro = Boolean(alert.miro_url?.trim())
  const timeLabel = alert.starts_at && alert.ends_at
    ? formatTimeRange(alert.starts_at, alert.ends_at)
    : ''

  return (
    <>
      <div className={`lesson-alert lesson-alert--${alert.phase}`} role="alert">
        <button type="button" className="lesson-alert-close" onClick={dismiss} aria-label="Закрити">
          <svg viewBox="0 0 24 24" aria-hidden>
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="lesson-alert-body">
          <div className="lesson-alert-badge-row">
            <Badge variant={alert.phase === 'active' ? 'green' : 'amber'}>
              {lessonAlertPhaseLabel(alert.phase)}
            </Badge>
            {timeLabel && <span className="lesson-alert-time">{timeLabel}</span>}
          </div>

          <h2 className="lesson-alert-title">{alert.message || 'Незабаром урок'}</h2>

          {alert.student_name && (
            <div className="lesson-alert-person">
              <PersonInline
                name={alert.student_name}
                optimateId={alert.student_id || undefined}
                kind="student"
                size="md"
              />
            </div>
          )}

          <div className="lesson-alert-actions">
            {hasZoom ? (
              <a
                href={alert.zoom_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-teal lesson-alert-btn"
              >
                Відкрити Zoom
              </a>
            ) : (
              <Link href="/teacher/settings#meeting-links" className="btn btn-sm btn-teal lesson-alert-btn">
                Додати Zoom
              </Link>
            )}

            {hasMiro ? (
              <button
                type="button"
                className="btn btn-primary lesson-alert-btn"
                onClick={() => setMiroOpen(true)}
              >
                Відкрити Miro
              </button>
            ) : (
              <Link href="/teacher/settings#meeting-links" className="btn btn-sm btn-primary lesson-alert-btn">
                Додати Miro
              </Link>
            )}

            <Link href="/teacher/schedule" className="btn btn-sm lesson-alert-btn">
              Розклад
            </Link>
          </div>
        </div>
      </div>

      {miroOpen && hasMiro && (
        <MiroEmbedModal
          url={alert.miro_url}
          title={alert.product_name ? `Miro · ${alert.product_name}` : 'Miro'}
          onClose={() => setMiroOpen(false)}
        />
      )}
    </>
  )
}
