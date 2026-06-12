'use client'

import { Badge } from '@/components/shared/UI'
import { CloseIcon, IconButton } from '@/components/shared/Icons'
import type { CalendarEvent, CalendarParticipant } from '@/lib/calendar-types'
import {
  formatDurationMinutes,
  formatEventDateFull,
  formatTimeRange,
} from '@/lib/calendar-utils'
import { EventHomeworkSection } from '@/components/homework/EventHomeworkSection'
import { StudentEventHomeworkSection } from '@/components/homework/StudentEventHomeworkSection'
import { ConfirmDialog } from '@/components/lesson-requests/ConfirmDialog'
import { lessonRequestsApi } from '@/lib/lesson-requests-api'
import { isEventActive } from '@/lib/optimate-api'
import { useEffect, useState, type ReactNode } from 'react'

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

function toIsoLocalInput(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function EventDetailModal({
  event,
  onClose,
  onParticipantClick,
  allowEscape = true,
  enableLessonRequests = false,
  enableHomework = false,
  enableStudentHomework = false,
  onOpenHomework,
  onRequestCreated,
}: {
  event: CalendarEvent | null
  onClose: () => void
  onParticipantClick?: (participant: CalendarParticipant) => void
  allowEscape?: boolean
  enableLessonRequests?: boolean
  enableHomework?: boolean
  enableStudentHomework?: boolean
  onOpenHomework?: (submissionId: number) => void
  onRequestCreated?: () => void
}) {
  const open = event != null
  const active = event ? isEventActive(event.starts_at, event.ends_at) : false
  const [cancelOpen, setCancelOpen] = useState(false)
  const [rescheduleOpen, setRescheduleOpen] = useState(false)
  const [rescheduleConfirmOpen, setRescheduleConfirmOpen] = useState(false)
  const [newStartsAt, setNewStartsAt] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [requestError, setRequestError] = useState('')
  const [requestSuccess, setRequestSuccess] = useState('')

  const canRequest = enableLessonRequests && event
    && event.status_label === 'Заплановано'
    && new Date(event.starts_at).getTime() > Date.now()

  useEffect(() => {
    if (!event) return
    setCancelOpen(false)
    setRescheduleOpen(false)
    setRescheduleConfirmOpen(false)
    setNewStartsAt(toIsoLocalInput(event.starts_at))
    setRequestError('')
    setRequestSuccess('')
  }, [event?.id])

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

  async function submitCancel() {
    if (!event) return
    setSubmitting(true)
    setRequestError('')
    try {
      await lessonRequestsApi.create({
        optimate_event_id: event.id,
        request_type: 'cancel',
        event_title: event.title,
        event_starts_at: event.starts_at,
        event_ends_at: event.ends_at,
        teacher_name: event.teacher_name ?? teachers[0]?.name ?? '',
        teacher_optimate_id: event.teacher_ids?.[0] ?? teachers[0]?.id ?? '',
      })
      setCancelOpen(false)
      setRequestSuccess('Запит на скасування надіслано. Очікуйте відповіді.')
      onRequestCreated?.()
    } catch (err) {
      setRequestError(err instanceof Error ? err.message : 'Помилка')
    } finally {
      setSubmitting(false)
    }
  }

  function openRescheduleConfirm() {
    if (!newStartsAt) {
      setRequestError('Оберіть нову дату та час')
      return
    }
    setRescheduleOpen(false)
    setRescheduleConfirmOpen(true)
  }

  async function submitReschedule() {
    if (!event || !newStartsAt) return
    const start = new Date(newStartsAt)
    if (Number.isNaN(start.getTime())) {
      setRequestError('Невірна дата')
      return
    }
    const durationMs = new Date(event.ends_at).getTime() - new Date(event.starts_at).getTime()
    const end = new Date(start.getTime() + (durationMs > 0 ? durationMs : 60 * 60 * 1000))

    setSubmitting(true)
    setRequestError('')
    try {
      await lessonRequestsApi.create({
        optimate_event_id: event.id,
        request_type: 'reschedule',
        event_title: event.title,
        event_starts_at: event.starts_at,
        event_ends_at: event.ends_at,
        teacher_name: event.teacher_name ?? teachers[0]?.name ?? '',
        teacher_optimate_id: event.teacher_ids?.[0] ?? teachers[0]?.id ?? '',
        requested_starts_at: start.toISOString(),
        requested_ends_at: end.toISOString(),
      })
      setRescheduleConfirmOpen(false)
      setRequestSuccess('Запит на перенесення надіслано. Очікуйте відповіді.')
      onRequestCreated?.()
    } catch (err) {
      setRequestError(err instanceof Error ? err.message : 'Помилка')
    } finally {
      setSubmitting(false)
    }
  }

  const newStartsLabel = newStartsAt
    ? formatEventDateFull(new Date(newStartsAt).toISOString())
    : ''

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

          {requestError && <div className="alert" style={{ marginTop: 12 }}>{requestError}</div>}
          {requestSuccess && <div className="student-login-success" style={{ marginTop: 12 }}>{requestSuccess}</div>}

          {enableHomework && (students.length > 0 || (event.student_names?.length ?? 0) > 0) && (
            <EventHomeworkSection event={event} />
          )}

          {enableStudentHomework && onOpenHomework && (
            <StudentEventHomeworkSection event={event} onOpen={onOpenHomework} />
          )}

          {canRequest && !requestSuccess && (
            <div className="cal-modal-actions">
              <button
                type="button"
                className="btn btn-sm btn-danger"
                onClick={() => setCancelOpen(true)}
              >
                Скасувати урок
              </button>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => setRescheduleOpen(true)}
              >
                Перенести урок
              </button>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={cancelOpen}
        title="Скасувати урок?"
        message="Буде створено запит на скасування. Адміністратор або викладач розгляне його. Урок у CRM не скасується автоматично."
        confirmLabel="Надіслати запит"
        danger
        loading={submitting}
        onConfirm={submitCancel}
        onCancel={() => setCancelOpen(false)}
      />

      <ConfirmDialog
        open={rescheduleOpen}
        title="Перенести урок"
        message="Оберіть нову дату та час. Після підтвердження запит буде надіслано на розгляд."
        confirmLabel="Далі"
        onConfirm={openRescheduleConfirm}
        onCancel={() => setRescheduleOpen(false)}
      >
        <label className="student-login-label" htmlFor="reschedule-datetime">
          Нова дата та час
        </label>
        <input
          id="reschedule-datetime"
          className="input"
          type="datetime-local"
          value={newStartsAt}
          onChange={e => setNewStartsAt(e.target.value)}
          style={{ width: '100%', marginBottom: 12 }}
        />
      </ConfirmDialog>

      <ConfirmDialog
        open={rescheduleConfirmOpen}
        title="Підтвердити перенесення?"
        message={`Запит на перенесення уроку на ${newStartsLabel}. Продовжити?`}
        confirmLabel="Надіслати запит"
        loading={submitting}
        onConfirm={submitReschedule}
        onCancel={() => setRescheduleConfirmOpen(false)}
      />
    </div>
  )
}
