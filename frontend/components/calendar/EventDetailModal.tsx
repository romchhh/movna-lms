'use client'

import { StatusBadge } from '@/components/shared/StatusBadge'
import { Badge } from '@/components/shared/UI'
import { AppModalHeader } from '@/components/shared/AppModalHeader'
import { statusAccentColor, type CalendarEvent, type CalendarParticipant } from '@/lib/calendar-types'
import {
  formatDurationMinutes,
  formatEventDateFull,
  formatTimeRange,
} from '@/lib/calendar-utils'
import { EventHomeworkSection } from '@/components/homework/EventHomeworkSection'
import { StudentEventHomeworkSection } from '@/components/homework/StudentEventHomeworkSection'
import { EventCurriculumTopicSection } from '@/components/curriculum/EventCurriculumTopicSection'
import { EventMeetingLinksSection } from '@/components/lesson/EventMeetingLinksSection'
import { ConfirmDialog } from '@/components/lesson-requests/ConfirmDialog'
import { TeacherAboutBlock, UserAvatar } from '@/components/shared/UserAvatar'
import { useLmsProfiles } from '@/hooks/useLmsProfiles'
import { lessonRequestsApi } from '@/lib/lesson-requests-api'
import { isEventActive } from '@/lib/optimate-api'
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'

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
  const ids = participants.map(p => p.id).filter(Boolean)
  useLmsProfiles(ids)

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
              className={`cal-participant-chip cal-participant-chip--with-avatar${clickable ? ' cal-participant-chip--link' : ''}`}
              onClick={clickable ? () => onParticipantClick!(p) : undefined}
            >
              <UserAvatar
                name={p.name}
                optimateId={p.id || undefined}
                size="xs"
                kind={p.kind === 'teacher' ? 'teacher' : 'student'}
              />
              <span>{p.name}</span>
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
  enableMeetingLinks = false,
  enableCurriculumTopic = false,
  curriculumAudience = 'student' as 'teacher' | 'student',
  curriculumStudentId,
  onOpenHomework,
  onRequestCreated,
  enableTeacherCancel = false,
  onTeacherCancel,
  enableTeacherMarking = false,
  onTeacherMark,
}: {
  event: CalendarEvent | null
  onClose: () => void
  onParticipantClick?: (participant: CalendarParticipant) => void
  allowEscape?: boolean
  enableLessonRequests?: boolean
  enableHomework?: boolean
  enableStudentHomework?: boolean
  enableMeetingLinks?: boolean
  enableCurriculumTopic?: boolean
  curriculumAudience?: 'teacher' | 'student'
  curriculumStudentId?: string
  onOpenHomework?: (submissionId: number) => void
  onRequestCreated?: () => void
  enableTeacherCancel?: boolean
  onTeacherCancel?: (event: CalendarEvent) => void
  enableTeacherMarking?: boolean
  onTeacherMark?: (event: CalendarEvent) => void
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

  const canTeacherCancel = enableTeacherCancel && event
    && event.status_label !== 'Проведено'
    && event.status_label !== 'Скасовано'
    && new Date(event.ends_at).getTime() > Date.now()

  const canTeacherMark = enableTeacherMarking && event
    && event.status_label === 'Заплановано'
    && new Date(event.starts_at).getTime() <= Date.now()

  function handleTeacherCancelClick() {
    if (!event || !onTeacherCancel) return
    onTeacherCancel(event)
    onClose()
  }

  function handleTeacherMarkClick() {
    if (!event || !onTeacherMark) return
    onTeacherMark(event)
    onClose()
  }

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
        className="cal-modal cal-modal--tinted"
        style={{ '--cal-modal-tint': statusAccentColor(event.status_label, event.status_variant) } as CSSProperties}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cal-modal-title"
      >
        <AppModalHeader
          titleId="cal-modal-title"
          title={event.title}
          subtitle={
            event.product_type_label && event.product_type_label !== event.title
              ? event.product_type_label
              : undefined
          }
          badges={
            <div className="cal-modal-badges">
              {event.status_label && (
                <StatusBadge
                  label={event.status_label}
                  variant={statusBadge(event.status_variant)}
                />
              )}
              {event.is_trial && <StatusBadge label="Пробний" variant="amber" emoji="🎯" />}
              {active && <StatusBadge label="Зараз" variant="teal" emoji="▶️" />}
            </div>
          }
          onClose={onClose}
        />

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
            {event.cancellation_reason && (
              <DetailRow label="Причина скасування" value={event.cancellation_reason} />
            )}
            {event.cancellation_note && (
              <DetailRow label="Коментар" value={event.cancellation_note} />
            )}
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
            {teachers.map(t => (
              t.id ? (
                <TeacherAboutBlock key={`about-${t.id}`} optimateId={t.id} />
              ) : null
            ))}
          </div>

          {onParticipantClick && (teachers.some(t => t.id) || students.some(s => s.id)) && (
            <p className="cal-modal-hint">Натисніть на ім’я, щоб відкрити профіль у Optimate</p>
          )}

          {requestError && <div className="alert" style={{ marginTop: 12 }}>{requestError}</div>}
          {requestSuccess && <div className="student-login-success" style={{ marginTop: 12 }}>{requestSuccess}</div>}

          {enableMeetingLinks && (
            <EventMeetingLinksSection
              teacherId={event.teacher_ids?.[0] ?? teachers[0]?.id}
              productName={event.product_type_label || event.title}
            />
          )}

          {enableCurriculumTopic && (
            <EventCurriculumTopicSection
              eventId={event.id}
              audience={curriculumAudience}
              studentOptimateId={curriculumStudentId ?? students[0]?.id}
            />
          )}

          {enableHomework && (students.length > 0 || (event.student_names?.length ?? 0) > 0) && (
            <EventHomeworkSection event={event} />
          )}

          {enableStudentHomework && onOpenHomework && (
            <StudentEventHomeworkSection event={event} onOpen={onOpenHomework} />
          )}

          {canTeacherMark && onTeacherMark && (
            <div className="cal-modal-actions cal-modal-actions--mark">
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={handleTeacherMarkClick}
              >
                Відмітити заняття
              </button>
              <p className="cal-modal-mark-hint">
                Позначте, чи урок відбувся — це потрібно для нарахування зарплати
              </p>
            </div>
          )}

          {canTeacherCancel && onTeacherCancel && (
            <div className="cal-modal-actions">
              <button
                type="button"
                className="btn btn-sm btn-danger"
                onClick={handleTeacherCancelClick}
              >
                Скасувати урок
              </button>
            </div>
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
