'use client'

import { MiroEmbedModal } from '@/components/lesson/MiroEmbedModal'
import {
  studentMeetingLinksApi,
  type MeetingLinks,
} from '@/lib/meeting-links-api'
import { useEffect, useState } from 'react'

interface EventMeetingLinksSectionProps {
  teacherId?: string
  productName?: string
}

export function EventMeetingLinksSection({
  teacherId,
  productName,
}: EventMeetingLinksSectionProps) {
  const [links, setLinks] = useState<MeetingLinks | null>(null)
  const [loading, setLoading] = useState(false)
  const [miroOpen, setMiroOpen] = useState(false)

  useEffect(() => {
    if (!teacherId) {
      setLinks(null)
      return
    }
    let cancelled = false
    setLoading(true)
    studentMeetingLinksApi
      .forTeacher(teacherId)
      .then(data => {
        if (!cancelled) setLinks(data)
      })
      .catch(() => {
        if (!cancelled) setLinks(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [teacherId])

  if (!teacherId) return null

  const zoomUrl = links?.zoom_url?.trim() || ''
  const miroUrl = links?.miro_url?.trim() || ''
  const hasZoom = Boolean(zoomUrl)
  const hasMiro = Boolean(miroUrl)

  if (loading && !links) {
    return (
      <div className="cal-meeting-links">
        <div className="cal-meeting-links-label">Посилання на урок</div>
        <p className="cal-meeting-links-hint">Завантаження…</p>
      </div>
    )
  }

  if (!loading && !hasZoom && !hasMiro) {
    return (
      <div className="cal-meeting-links">
        <div className="cal-meeting-links-label">Посилання на урок</div>
        <p className="cal-meeting-links-hint">
          Викладач ще не додав Zoom або Miro для цього уроку
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="cal-meeting-links">
        <div className="cal-meeting-links-label">Посилання на урок</div>
        <div className="cal-meeting-links-actions">
          {hasZoom && (
            <a
              href={zoomUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm btn-teal"
            >
              Приєднатися (Zoom)
            </a>
          )}
          {hasMiro && (
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => setMiroOpen(true)}
            >
              Відкрити Miro
            </button>
          )}
        </div>
        {!hasZoom && hasMiro && (
          <p className="cal-meeting-links-hint">Посилання Zoom ще не додано</p>
        )}
        {hasZoom && !hasMiro && (
          <p className="cal-meeting-links-hint">Посилання Miro ще не додано</p>
        )}
      </div>

      {miroOpen && hasMiro && (
        <MiroEmbedModal
          url={miroUrl}
          title={productName ? `Miro · ${productName}` : 'Miro'}
          onClose={() => setMiroOpen(false)}
        />
      )}
    </>
  )
}
