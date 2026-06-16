'use client'

import { FilterChipBar } from '@/components/shared/FilterChipBar'
import { StatusBadge } from '@/components/shared/StatusBadge'
import {
  LessonRequest,
  REQUEST_STATUS_LABELS,
  REQUEST_TYPE_LABELS,
  lessonRequestsApi,
} from '@/lib/lesson-requests-api'
import { formatEventDateFull, formatTimeRange } from '@/lib/calendar-utils'
import {
  lessonRequestStatusMeta,
  lessonRequestTypeMeta,
} from '@/lib/status-ui'
import { useCallback, useEffect, useState } from 'react'

interface LessonRequestsPanelProps {
  role: 'admin' | 'teacher'
}

const FILTER_CHIPS = [
  { key: 'all' as const, label: 'Всі', emoji: '📋', accent: 'gray' as const },
  { key: 'pending' as const, label: 'Очікують', emoji: '⏳', accent: 'amber' as const },
  { key: 'approved' as const, label: 'Схвалені', emoji: '✅', accent: 'green' as const },
  { key: 'rejected' as const, label: 'Відхилені', emoji: '❌', accent: 'red' as const },
]

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
        <FilterChipBar
          value={filter}
          onChange={setFilter}
          chips={FILTER_CHIPS.map(chip => ({
            ...chip,
            count: chip.key === 'pending' ? pendingCount : undefined,
          }))}
          showCounts
        />
      </div>

      {loading && <p className="optimate-detail-empty">Завантаження запитів...</p>}

      {!loading && items.length === 0 && (
        <p className="optimate-detail-empty">Запитів немає</p>
      )}

      <div className="lesson-requests-list">
        {items.map(item => {
          const statusMeta = lessonRequestStatusMeta(item.status)
          const typeMeta = lessonRequestTypeMeta(item.request_type)
          return (
            <article
              key={item.id}
              className={`lesson-request-card${item.status === 'pending' ? ' lesson-request-card--pending' : ''}`}
            >
              <div className="lesson-request-card-top">
                <div>
                  <div className="lesson-request-card-badges">
                    <StatusBadge
                      label={REQUEST_STATUS_LABELS[item.status]}
                      meta={statusMeta}
                    />
                    <StatusBadge
                      label={REQUEST_TYPE_LABELS[item.request_type]}
                      meta={typeMeta}
                    />
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
                    ✅ Схвалити
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    disabled={resolvingId === item.id}
                    onClick={() => handleResolve(item.id, 'rejected')}
                  >
                    ❌ Відхилити
                  </button>
                </div>
              )}
            </article>
          )
        })}
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
