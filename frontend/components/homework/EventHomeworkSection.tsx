'use client'

import { HomeworkAssignModal } from '@/components/homework/HomeworkAssignModal'
import { AddButtonLabel } from '@/components/shared/AddButtonLabel'
import { Badge } from '@/components/shared/UI'
import type { CalendarEvent } from '@/lib/calendar-types'
import { homeworkApi, type HomeworkAssignment } from '@/lib/homework-api'
import { useCallback, useEffect, useState } from 'react'

export function EventHomeworkSection({ event }: { event: CalendarEvent }) {
  const [assignment, setAssignment] = useState<HomeworkAssignment | null>(null)
  const [loading, setLoading] = useState(true)
  const [editorOpen, setEditorOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await homeworkApi.byEvent(event.id)
      setAssignment(res)
    } catch {
      setAssignment(null)
    } finally {
      setLoading(false)
    }
  }, [event.id])

  useEffect(() => {
    load()
  }, [load])

  const pendingReview = assignment?.submissions.filter(s => s.status === 'completed').length ?? 0

  return (
    <div className="hw-event-section">
      <div className="hw-event-section-head">
        <h3>Домашнє завдання</h3>
        {assignment && pendingReview > 0 && (
          <Badge variant="red">{pendingReview} на перевірці</Badge>
        )}
      </div>
      {loading && <p className="hw-event-muted">Завантаження…</p>}
      {!loading && !assignment && (
        <p className="hw-event-muted">ДЗ для цього уроку ще не створено</p>
      )}
      {!loading && assignment && (
        <>
          <p className="hw-event-muted">
            {assignment.submissions.length} учн. · дедлайн{' '}
            {assignment.deadline_at
              ? new Date(assignment.deadline_at).toLocaleString('uk-UA')
              : 'не вказано'}
          </p>
          {assignment.body_markdown.trim() && (
            <p className="hw-event-preview">
              {assignment.body_markdown.replace(/\s+/g, ' ').trim().slice(0, 140)}
              {assignment.body_markdown.length > 140 ? '…' : ''}
            </p>
          )}
        </>
      )}
      <button
        type="button"
        className="btn btn-sm btn-teal"
        onClick={() => setEditorOpen(true)}
      >
        {assignment ? 'Редагувати ДЗ' : <AddButtonLabel>Додати ДЗ</AddButtonLabel>}
      </button>

      {editorOpen && (
        <HomeworkAssignModal
          event={event}
          existing={assignment}
          onClose={() => setEditorOpen(false)}
          onSaved={load}
        />
      )}
    </div>
  )
}
