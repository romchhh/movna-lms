'use client'

import { Badge } from '@/components/shared/UI'
import {
  LessonRequest,
  REQUEST_STATUS_LABELS,
  REQUEST_TYPE_LABELS,
  lessonRequestsApi,
} from '@/lib/lesson-requests-api'
import { formatEventDateFull, formatTimeRange } from '@/lib/calendar-utils'
import { useCallback, useEffect, useState } from 'react'

interface LessonRequestsPanelProps {
  role: 'admin' | 'teacher'
}

function statusVariant(status: LessonRequest['status']) {
  if (status === 'pending') return 'amber' as const
  if (status === 'approved') return 'green' as const
  return 'red' as const
}

export function LessonRequestsPanel({ role }: LessonRequestsPanelProps) {
  const [items, setItems] = useState<LessonRequest[]>([])
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notes, setNotes] = useState<Record<number, string>>({})
  const [resolvingId, setResolvingId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const status = filter === 'all' ? '' : filter
      setItems(await lessonRequestsApi.list(status))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка')
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    load()
  }, [load])

  async function handleResolve(id: number, status: 'approved' | 'rejected') {
    setResolvingId(id)
    setError('')
    try {
      await lessonRequestsApi.resolve(id, status, notes[id] ?? '')
      setNotes(prev => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка')
    } finally {
      setResolvingId(null)
    }
  }

  const pendingCount = items.filter(i => i.status === 'pending').length

  return (
    <>
      {error && <div className="alert">{error}</div>}

      <div className="admin-filters" style={{ marginBottom: 16 }}>
        {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
          <button
            key={f}
            type="button"
            className="btn btn-sm"
            style={{
              background: filter === f ? 'var(--pl)' : 'var(--bg2)',
              color: filter === f ? 'var(--pd)' : 'var(--tx2)',
              border: `.5px solid ${filter === f ? 'var(--pm)' : 'var(--bd2)'}`,
            }}
            onClick={() => setFilter(f)}
          >
            {{ all: 'Всі', pending: 'Очікують', approved: 'Схвалені', rejected: 'Відхилені' }[f]}
            {f === 'pending' && pendingCount > 0 && (
              <span className="nav-badge" style={{ marginLeft: 6 }}>{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {loading && <p className="optimate-detail-empty">Завантаження запитів...</p>}

      {!loading && items.length === 0 && (
        <p className="optimate-detail-empty">Запитів немає</p>
      )}

      <div className="lesson-requests-list">
        {items.map(item => (
          <article
            key={item.id}
            className={`lesson-request-card${item.status === 'pending' ? ' lesson-request-card--pending' : ''}`}
          >
            <div className="lesson-request-card-top">
              <div>
                <div className="lesson-request-card-badges">
                  <Badge variant={statusVariant(item.status)}>
                    {REQUEST_STATUS_LABELS[item.status]}
                  </Badge>
                  <Badge variant="gray">{REQUEST_TYPE_LABELS[item.request_type]}</Badge>
                </div>
                <h4 className="lesson-request-card-title">{item.event_title || 'Урок'}</h4>
                <p className="lesson-request-card-meta">
                  {item.student_name} · {item.teacher_name || 'Викладач'}
                </p>
              </div>
              <time className="lesson-request-card-date">
                {formatEventDateFull(item.event_starts_at)}
              </time>
            </div>

            <div className="lesson-request-card-details">
              <span>
                Поточний час: {formatTimeRange(item.event_starts_at, item.event_ends_at)}
              </span>
              {item.request_type === 'reschedule' && item.requested_starts_at && (
                <span className="lesson-request-reschedule">
                  Нова дата: {formatEventDateFull(item.requested_starts_at)}
                  {item.requested_ends_at && ` · ${formatTimeRange(item.requested_starts_at, item.requested_ends_at)}`}
                </span>
              )}
              {item.student_comment && (
                <span>Коментар учня: {item.student_comment}</span>
              )}
              {item.admin_note && (
                <span>Відповідь: {item.admin_note}</span>
              )}
            </div>

            {item.status === 'pending' && (
              <div className="lesson-request-card-actions">
                <input
                  className="input"
                  placeholder="Коментар для учня (необовʼязково)"
                  value={notes[item.id] ?? ''}
                  onChange={e => setNotes(prev => ({ ...prev, [item.id]: e.target.value }))}
                />
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{ background: 'var(--gl)', color: 'var(--gd)' }}
                  disabled={resolvingId === item.id}
                  onClick={() => handleResolve(item.id, 'approved')}
                >
                  {resolvingId === item.id ? '...' : 'Схвалити'}
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-danger"
                  disabled={resolvingId === item.id}
                  onClick={() => handleResolve(item.id, 'rejected')}
                >
                  {resolvingId === item.id ? '...' : 'Відхилити'}
                </button>
              </div>
            )}
          </article>
        ))}
      </div>

      <p className="student-login-hint" style={{ marginTop: 12 }}>
        {role === 'teacher'
          ? 'Показуються запити лише на ваші уроки.'
          : 'Показуються всі запити учнів.'}
        {' '}Схвалення не змінює розклад у Optimate автоматично — після схвалення внесіть зміни в CRM.
      </p>
    </>
  )
}
