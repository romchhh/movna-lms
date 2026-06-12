'use client'

import { Badge } from '@/components/shared/UI'
import {
  formatHomeworkDeadline,
  HOMEWORK_STATUS_LABELS,
  homeworkStatusVariant,
  isHomeworkOverdue,
} from '@/lib/homework-api'
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
          <Badge variant={homeworkStatusVariant(hw.status)}>
            {HOMEWORK_STATUS_LABELS[hw.status]}
          </Badge>
        )}
      </div>
      {loading && <p className="hw-event-muted">Завантаження…</p>}
      {!loading && !hw && (
        <p className="hw-event-muted">Для цього уроку домашнього завдання немає</p>
      )}
      {!loading && hw && (
        <>
          <p className="hw-event-muted">
            {hw.title}
            {hw.deadline_at && ` · до ${formatHomeworkDeadline(hw.deadline_at)}`}
            {isHomeworkOverdue(hw.deadline_at, hw.status) && (
              <span className="hw-overdue"> · прострочено</span>
            )}
          </p>
          {hw.teacher_review_note && hw.status === 'reviewed' && (
            <p className="hw-event-preview">Є коментар від викладача</p>
          )}
          <button
            type="button"
            className="btn btn-sm btn-teal"
            onClick={() => onOpen(hw.submission_id)}
          >
            {hw.status === 'assigned' || hw.status === 'viewed'
              ? 'Виконати ДЗ'
              : 'Переглянути ДЗ'}
          </button>
        </>
      )}
    </div>
  )
}
