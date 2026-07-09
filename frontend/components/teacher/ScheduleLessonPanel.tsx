'use client'

import { Badge, Empty } from '@/components/shared/UI'
import { UserAvatar } from '@/components/shared/UserAvatar'
import {
  type LessonCancellationReason,
  type LessonNotHeldReason,
  type TeacherEventCreatePayload,
  type TeacherStudent,
  teacherOptimateApi,
} from '@/lib/teacher-optimate-api'
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'

interface ScheduleLessonPanelProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
  preselectedStudentId?: string | null
}

function defaultStartsAtLocal() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(10, 0, 0, 0)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T10:00`
}

function toIsoUtc(localValue: string): string {
  const d = new Date(localValue)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString()
}

export function ScheduleLessonPanel({
  open,
  onClose,
  onCreated,
  preselectedStudentId,
}: ScheduleLessonPanelProps) {
  const [students, setStudents] = useState<TeacherStudent[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [search, setSearch] = useState('')
  const [studentId, setStudentId] = useState('')
  const [productId, setProductId] = useState('')
  const [startsAtLocal, setStartsAtLocal] = useState(defaultStartsAtLocal)
  const [duration, setDuration] = useState(60)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadStudents = useCallback(async () => {
    setLoadingStudents(true)
    try {
      const res = await teacherOptimateApi.students(1, 100)
      setStudents(res.data.filter(s => !s.is_speaking_club_only))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося завантажити учнів')
    } finally {
      setLoadingStudents(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    setError('')
    setSuccess('')
    setStartsAtLocal(defaultStartsAtLocal())
    loadStudents()
  }, [open, loadStudents])

  useEffect(() => {
    if (!open) return
    if (preselectedStudentId) {
      setStudentId(preselectedStudentId)
    }
  }, [open, preselectedStudentId])

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return students
    return students.filter(s =>
      s.full_name.toLowerCase().includes(q)
      || (s.email || '').toLowerCase().includes(q),
    )
  }, [students, search])

  const selectedStudent = useMemo(
    () => students.find(s => s.id === studentId) ?? null,
    [students, studentId],
  )

  const bookableProducts = useMemo(
    () => (selectedStudent?.products || []).filter(p => (p.product_type ?? 1) === 1),
    [selectedStudent],
  )

  useEffect(() => {
    if (!selectedStudent) {
      setProductId('')
      return
    }
    const first = bookableProducts[0]
    setProductId(first?.product_id || '')
  }, [selectedStudent, bookableProducts])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!studentId) {
      setError('Оберіть учня')
      return
    }
    const startsAt = toIsoUtc(startsAtLocal)
    if (!startsAt) {
      setError('Оберіть дату та час')
      return
    }
    if (new Date(startsAt).getTime() <= Date.now()) {
      setError('Час уроку має бути в майбутньому')
      return
    }

    setSubmitting(true)
    setError('')
    setSuccess('')
    try {
      const payload: TeacherEventCreatePayload = {
        student_id: studentId,
        starts_at: startsAt,
        duration,
      }
      if (productId) payload.product_id = productId
      const res = await teacherOptimateApi.createEvent(payload)
      setSuccess(res.message || 'Урок створено')
      onCreated()
      window.setTimeout(() => onClose(), 700)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка створення уроку')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="schedule-panel-overlay" onClick={onClose} role="presentation">
      <aside
        className="schedule-panel"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-panel-title"
      >
        <header className="schedule-panel-header">
          <div>
            <h2 id="schedule-panel-title" className="schedule-panel-title">Запланувати урок</h2>
            <p className="schedule-panel-sub">Урок одразу з’явиться в Optimate і вашому календарі</p>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Закрити">
            ✕
          </button>
        </header>

        <form className="schedule-panel-body" onSubmit={handleSubmit}>
          <section className="schedule-panel-section">
            <label className="schedule-panel-label" htmlFor="schedule-student-search">Учень</label>
            <input
              id="schedule-student-search"
              className="input"
              placeholder="Пошук за ім’ям або email"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <div className="schedule-student-grid">
              {loadingStudents && <Empty label="Завантаження учнів..." />}
              {!loadingStudents && filteredStudents.length === 0 && (
                <Empty label="Немає учнів для індивідуальних уроків" />
              )}
              {filteredStudents.map(student => {
                const active = student.id === studentId
                return (
                  <button
                    key={student.id}
                    type="button"
                    className={`schedule-student-card${active ? ' schedule-student-card--active' : ''}`}
                    onClick={() => setStudentId(student.id)}
                  >
                    <UserAvatar name={student.full_name} optimateId={student.id} size="md" kind="student" />
                    <div className="schedule-student-card-body">
                      <div className="schedule-student-card-name">{student.full_name}</div>
                      <div className="schedule-student-card-sub">
                        {student.product_names[0] || student.email || '—'}
                      </div>
                    </div>
                    <Badge variant={student.remaining_lessons <= 2 ? 'amber' : 'green'}>
                      {student.remaining_lessons} ур.
                    </Badge>
                  </button>
                )
              })}
            </div>
          </section>

          {selectedStudent && bookableProducts.length > 0 && (
            <section className="schedule-panel-section">
              <label className="schedule-panel-label" htmlFor="schedule-product">Продукт</label>
              <select
                id="schedule-product"
                className="input"
                value={productId}
                onChange={e => setProductId(e.target.value)}
              >
                {bookableProducts.map(product => (
                  <option key={product.product_id} value={product.product_id}>
                    {product.product_name} · {product.lessons_remaining} ур.
                  </option>
                ))}
              </select>
            </section>
          )}

          <section className="schedule-panel-grid">
            <div className="schedule-panel-section">
              <label className="schedule-panel-label" htmlFor="schedule-starts">Дата і час</label>
              <input
                id="schedule-starts"
                type="datetime-local"
                className="input"
                value={startsAtLocal}
                onChange={e => setStartsAtLocal(e.target.value)}
                required
              />
            </div>
            <div className="schedule-panel-section">
              <label className="schedule-panel-label" htmlFor="schedule-duration">Тривалість</label>
              <select
                id="schedule-duration"
                className="input"
                value={duration}
                onChange={e => setDuration(Number(e.target.value))}
              >
                <option value={45}>45 хв</option>
                <option value={60}>60 хв</option>
                <option value={90}>90 хв</option>
              </select>
            </div>
          </section>

          {error && <div className="alert">{error}</div>}
          {success && <div className="student-login-success">{success}</div>}

          <footer className="schedule-panel-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Скасувати
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting || !studentId}>
              {submitting ? 'Створення…' : 'Створити урок'}
            </button>
          </footer>
        </form>
      </aside>
    </div>
  )
}

export function TeacherMarkLessonDialog({
  open,
  eventId,
  eventTitle,
  onClose,
  onCompleted,
}: {
  open: boolean
  eventId: string
  eventTitle: string
  onClose: () => void
  onCompleted: () => Promise<void>
}) {
  const [step, setStep] = useState<'choose' | 'reason'>('choose')
  const [reasons, setReasons] = useState<LessonNotHeldReason[]>([])
  const [reasonCode, setReasonCode] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!open) return
    setStep('choose')
    setError('')
    setSuccess('')
    setNote('')
    teacherOptimateApi.notHeldReasons()
      .then(items => {
        setReasons(items)
        setReasonCode(items[0]?.code || '')
      })
      .catch(() => setReasons([]))
  }, [open])

  if (!open) return null

  async function markCompleted() {
    if (!eventId) return
    setSubmitting(true)
    setError('')
    try {
      const res = await teacherOptimateApi.completeEvent(eventId)
      setSuccess(res.message + (res.optimate_synced === false ? ' (збережено в LMS)' : ''))
      await onCompleted()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка')
    } finally {
      setSubmitting(false)
    }
  }

  async function markNotHeld() {
    if (!eventId) return
    if (!reasonCode) {
      setError('Оберіть причину')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const res = await teacherOptimateApi.markEventNotHeld(eventId, {
        reason_code: reasonCode,
        note,
      })
      setSuccess(res.message + (res.optimate_synced === false ? ' (збережено в LMS)' : ''))
      await onCompleted()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="cal-modal-overlay cal-modal-overlay--stack" onClick={onClose} role="presentation">
      <div
        className="cal-modal cal-modal--tinted schedule-mark-modal"
        style={{ '--cal-modal-tint': 'var(--t)' } as CSSProperties}
        onClick={e => e.stopPropagation()}
        role="dialog"
      >
        <div className="cal-modal-body" style={{ paddingTop: 18 }}>
          <h3 style={{ margin: '0 0 6px', fontSize: 18 }}>Відмітити заняття</h3>
          <p style={{ margin: '0 0 16px', color: 'var(--tx2)', fontSize: 13 }}>{eventTitle}</p>

          {step === 'choose' ? (
            <div className="schedule-mark-options">
              <button
                type="button"
                className="schedule-mark-option schedule-mark-option--done"
                disabled={submitting}
                onClick={markCompleted}
              >
                <span className="schedule-mark-option-title">Проведене заняття</span>
                <span className="schedule-mark-option-sub">Урок відбувся, нарахування ЗП</span>
              </button>
              <button
                type="button"
                className="schedule-mark-option schedule-mark-option--missed"
                disabled={submitting}
                onClick={() => setStep('reason')}
              >
                <span className="schedule-mark-option-title">Заняття не відбулось</span>
                <span className="schedule-mark-option-sub">Потрібна причина</span>
              </button>
            </div>
          ) : (
            <>
              <p className="schedule-mark-reasons-label">Будь ласка, вкажіть причину</p>
              <div className="schedule-mark-reasons">
                {reasons.map(reason => (
                  <label key={reason.code} className="schedule-mark-reason">
                    <input
                      type="radio"
                      name="not-held-reason"
                      value={reason.code}
                      checked={reasonCode === reason.code}
                      onChange={() => setReasonCode(reason.code)}
                    />
                    <span>{reason.label}</span>
                  </label>
                ))}
              </div>

              <label className="schedule-panel-label" htmlFor="mark-note" style={{ marginTop: 12 }}>
                Коментар (необовʼязково)
              </label>
              <textarea
                id="mark-note"
                className="input"
                rows={2}
                value={note}
                onChange={e => setNote(e.target.value)}
              />
            </>
          )}

          {error && <div className="alert" style={{ marginTop: 12 }}>{error}</div>}
          {success && <div className="student-login-success" style={{ marginTop: 12 }}>{success}</div>}

          <div className="schedule-panel-footer" style={{ marginTop: 16 }}>
            {step === 'reason' ? (
              <button type="button" className="btn btn-secondary" onClick={() => setStep('choose')}>
                Назад
              </button>
            ) : (
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Скасувати
              </button>
            )}
            {step === 'reason' && (
              <button type="button" className="btn btn-primary" disabled={submitting} onClick={markNotHeld}>
                {submitting ? 'Збереження…' : 'Підтвердити'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function TeacherCancelLessonDialog({
  open,
  eventTitle,
  onClose,
  onConfirm,
}: {
  open: boolean
  eventTitle: string
  onClose: () => void
  onConfirm: (reasonCode: string, note: string) => Promise<void>
}) {
  const [reasons, setReasons] = useState<LessonCancellationReason[]>([])
  const [reasonCode, setReasonCode] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setError('')
    setNote('')
    teacherOptimateApi.cancellationReasons()
      .then(items => {
        setReasons(items)
        setReasonCode(items[0]?.code || '')
      })
      .catch(() => setReasons([]))
  }, [open])

  if (!open) return null

  async function submit() {
    if (!reasonCode) {
      setError('Оберіть причину')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await onConfirm(reasonCode, note)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка скасування')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="cal-modal-overlay cal-modal-overlay--stack" onClick={onClose} role="presentation">
      <div
        className="cal-modal cal-modal--tinted schedule-cancel-modal"
        style={{ '--cal-modal-tint': 'var(--rd)' } as CSSProperties}
        onClick={e => e.stopPropagation()}
        role="dialog"
      >
        <div className="cal-modal-body" style={{ paddingTop: 18 }}>
          <h3 style={{ margin: '0 0 6px', fontSize: 18 }}>Скасувати урок</h3>
          <p style={{ margin: '0 0 16px', color: 'var(--tx2)', fontSize: 13 }}>{eventTitle}</p>

          <label className="schedule-panel-label" htmlFor="cancel-reason">Причина</label>
          <select
            id="cancel-reason"
            className="input"
            value={reasonCode}
            onChange={e => setReasonCode(e.target.value)}
            style={{ marginBottom: 12 }}
          >
            {reasons.map(r => (
              <option key={r.code} value={r.code}>{r.label}</option>
            ))}
          </select>

          <label className="schedule-panel-label" htmlFor="cancel-note">Коментар (необов’язково)</label>
          <textarea
            id="cancel-note"
            className="input"
            rows={3}
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Додаткові деталі для вашої команди"
          />

          {error && <div className="alert" style={{ marginTop: 12 }}>{error}</div>}

          <div className="schedule-panel-footer" style={{ marginTop: 16 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Назад</button>
            <button type="button" className="btn btn-danger" disabled={submitting} onClick={submit}>
              {submitting ? 'Скасування…' : 'Підтвердити скасування'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
