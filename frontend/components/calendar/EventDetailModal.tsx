'use client'

import { Badge } from '@/components/shared/UI'
import { CloseIcon, IconButton } from '@/components/shared/Icons'
import type { CalendarEvent, CalendarParticipant } from '@/lib/calendar-types'
import {
  formatDurationMinutes,
  formatEventDateFull,
  formatTimeRange,
} from '@/lib/calendar-utils'
import { isEventActive } from '@/lib/optimate-api'
import { useEffect, type ReactNode } from 'react'

function statusBadge(variant?: CalendarEvent['status_variant']) {
  if (!variant) return 'gray' as const
  return variant
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  if (!value || value === '—') return null
  return (
    <div className="cal-detail-row">
      <span className="cal-detail-label">{label}</span>
      <span className="cal-detail-value">{value}</span>
    </div>
  )
}

function ParticipantsRow({
  label,
  participants,
  onParticipantClick,
}: {
  label: string
  participants: CalendarParticipant[]
  onParticipantClick?: (participant: CalendarParticipant) => void
}) {
  if (!participants.length) return null

  return (
    <div className="cal-detail-row cal-detail-row--participants">
      <span className="cal-detail-label">{label}</span>
      <div className="cal-detail-chips">
        {participants.map((p, i) => {
          const clickable = Boolean(onParticipantClick && p.id)
          const Tag = clickable ? 'button' : 'span'
          return (
            <Tag
              key={`${p.kind}-${p.id || p.name}-${i}`}
              type={clickable ? 'button' : undefined}
              className={`cal-participant-chip${clickable ? ' cal-participant-chip--link' : ''}`}
              onClick={clickable ? () => onParticipantClick!(p) : undefined}
            >
              {p.name}
            </Tag>
          )
        })}
      </div>
    </div>
  )
}

export function EventDetailModal({
  event,
  onClose,
  onParticipantClick,
  allowEscape = true,
}: {
  event: CalendarEvent | null
  onClose: () => void
  onParticipantClick?: (participant: CalendarParticipant) => void
  allowEscape?: boolean
}) {
  const open = event != null
  const active = event ? isEventActive(event.starts_at, event.ends_at) : false

  useEffect(() => {
    if (!open || !allowEscape) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose, allowEscape])

  if (!event) return null

  const teachers = event.teachers ?? []
  const students = event.students ?? []

  return (
    <div className="cal-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="cal-modal"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cal-modal-title"
      >
        <div
          className="cal-modal-accent"
          style={{ background: event.accent_color ?? 'var(--p)' }}
        />
        <div className="cal-modal-header">
          <div className="cal-modal-header-text">
            <div className="cal-modal-badges">
              {event.status_label && (
                <Badge variant={statusBadge(event.status_variant)}>{event.status_label}</Badge>
              )}
              {event.is_trial && <Badge variant="amber">Пробний</Badge>}
              {active && <Badge variant="teal">Зараз</Badge>}
            </div>
            <h2 id="cal-modal-title">{event.title}</h2>
            {event.product_type_label && event.product_type_label !== event.title && (
              <p className="cal-modal-subtitle">{event.product_type_label}</p>
            )}
          </div>
          <IconButton label="Закрити" onClick={onClose} className="cal-modal-close">
            <CloseIcon />
          </IconButton>
        </div>

        <div className="cal-modal-body">
          <div className="cal-modal-hero">
            <div className="cal-modal-hero-time">
              {formatTimeRange(event.starts_at, event.ends_at)}
            </div>
            <div className="cal-modal-hero-date">{formatEventDateFull(event.starts_at)}</div>
          </div>

          <div className="cal-modal-details">
            <DetailRow label="Тривалість" value={formatDurationMinutes(event.duration_minutes)} />
            <DetailRow label="Формат" value={event.schedule_class_label} />
            <DetailRow label="Тип події" value={event.event_type_label} />
            <ParticipantsRow
              label="Викладач"
              participants={teachers}
              onParticipantClick={onParticipantClick}
            />
            <ParticipantsRow
              label="Учні"
              participants={students}
              onParticipantClick={onParticipantClick}
            />
          </div>

          {onParticipantClick && (teachers.some(t => t.id) || students.some(s => s.id)) && (
            <p className="cal-modal-hint">Натисніть на ім’я, щоб відкрити профіль у Optimate</p>
          )}
        </div>
      </div>
    </div>
  )
}
