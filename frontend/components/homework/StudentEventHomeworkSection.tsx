'use client'

import { StatusBadge } from '@/components/shared/StatusBadge'
import {
  formatHomeworkDeadline,
  HOMEWORK_STATUS_LABELS,
  isHomeworkOverdue,
} from '@/lib/homework-api'
import { homeworkStatusMeta } from '@/lib/status-ui'
import type { CalendarEvent } from '@/lib/calendar-types'
import { useStudentHomework } from '@/hooks/useStudentHomework'

interface StudentEventHomeworkSectionProps {
  event: CalendarEvent
  onOpen: (submissionId: number) => void
}

export function StudentEventHomeworkSection({ event, onOpen }: StudentEventHomeworkSectionProps) {
  const { items, loading } = useStudentHomework()
  const hw = items.find(i => i.optimate_event_id === event.id)

  return (
    <div className="hw-event-section">
      <div className="hw-event-section-head">
        <h3>Домашнє завдання</h3>
        {hw && (
          <StatusBadge
            label={HOMEWORK_STATUS_LABELS[hw.status]}
            meta={homeworkStatusMeta(hw.status)}
          />
        )}
      </div>
      {loading && <p className="hw-event-muted">Завантаження…</p>}
      {!loading && !hw && (
        <p className="hw-event-muted">Для цього уроку домашнього завдання немає</p>
      )}
      {!loading && hw && (
        <button type="button" className="hw-event-link" onClick={() => onOpen(hw.submission_id)}>
          <span className="hw-event-link-title">{hw.title}</span>
          {hw.deadline_at && (
            <span className="hw-event-link-meta">
              {isHomeworkOverdue(hw.deadline_at, hw.status) ? '⚠️ ' : ''}
              До {formatHomeworkDeadline(hw.deadline_at)}
            </span>
          )}
        </button>
      )}
    </div>
  )
}
