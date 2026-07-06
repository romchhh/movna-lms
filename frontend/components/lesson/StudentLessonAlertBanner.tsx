'use client'

import { MiroEmbedModal } from '@/components/lesson/MiroEmbedModal'
import { Badge } from '@/components/shared/UI'
import { PersonInline, TeacherAboutBlock } from '@/components/shared/UserAvatar'
import {
  dismissLessonAlert,
  isLessonAlertDismissed,
  lessonAlertPhaseLabel,
  studentLessonAlertApi,
  type LessonAlert,
} from '@/lib/meeting-links-api'
import { formatTimeRange } from '@/lib/calendar-utils'
import { useCallback, useEffect, useState } from 'react'

export function StudentLessonAlertBanner() {
  const [alert, setAlert] = useState<LessonAlert | null>(null)
  const [visible, setVisible] = useState(false)
  const [miroOpen, setMiroOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await studentLessonAlertApi.get()
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
  }, [])

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

          <h2 className="lesson-alert-title">{alert.message || 'У вас активний урок'}</h2>

          {alert.teacher_name && (
            <div className="lesson-alert-person">
              <PersonInline
                name={alert.teacher_name}
                optimateId={alert.teacher_id || undefined}
                kind="teacher"
                size="md"
              />
              <TeacherAboutBlock
                optimateId={alert.teacher_id || undefined}
                compact
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
                Приєднатися до уроку
              </a>
            ) : (
              <span className="lesson-alert-missing">Посилання на урок ще не додано викладачем</span>
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
              <span className="lesson-alert-missing">Посилання Miro ще не додано викладачем</span>
            )}
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
