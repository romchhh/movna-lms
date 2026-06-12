'use client'

import { HomeworkFileLink } from '@/components/homework/HomeworkFileLink'
import { MarkdownView } from '@/components/homework/MarkdownView'
import { Badge } from '@/components/shared/UI'
import { CloseIcon, EditIcon, IconButton } from '@/components/shared/Icons'
import { useHomeworkModal } from '@/hooks/useHomeworkModal'
import {
  HOMEWORK_STATUS_LABELS,
  formatHomeworkDeadline,
  homeworkStatusVariant,
  isHomeworkOverdue,
  type HomeworkAssignment,
  type HomeworkSubmission,
} from '@/lib/homework-api'
import { formatEventDateFull, formatTimeRange } from '@/lib/calendar-utils'

interface HomeworkTeacherDetailModalProps {
  assignment: HomeworkAssignment
  submission?: HomeworkSubmission | null
  onClose: () => void
  onEdit: () => void
  onReview?: (submission: HomeworkSubmission) => void
}

export function HomeworkTeacherDetailModal({
  assignment,
  submission,
  onClose,
  onEdit,
  onReview,
}: HomeworkTeacherDetailModalProps) {
  useHomeworkModal(true, onClose)

  const hasPending = assignment.submissions.some(s => s.status === 'completed' || s.status === 'assigned' || s.status === 'viewed')
  const eventLine = [
    assignment.event_title || 'Урок',
    formatEventDateFull(assignment.event_starts_at),
    formatTimeRange(assignment.event_starts_at, assignment.event_ends_at),
  ].join(' · ')

  return (
    <div className="hw-modal-overlay" onClick={onClose}>
      <div
        className="hw-modal hw-modal--wide"
        role="dialog"
        aria-modal="true"
        onClick={e => e.stopPropagation()}
      >
        <div className="hw-modal-header">
          <div>
            <h2>{assignment.title}</h2>
            <p className="hw-modal-sub">{eventLine}</p>
          </div>
          <IconButton label="Закрити" onClick={onClose}><CloseIcon /></IconButton>
        </div>

        <div className="hw-modal-body">
          <div className="hw-detail-meta">
            {assignment.deadline_at && (
              <span>
                Дедлайн: {formatHomeworkDeadline(assignment.deadline_at)}
                {hasPending && isHomeworkOverdue(assignment.deadline_at, 'assigned') && (
                  <Badge variant="red">Прострочено</Badge>
                )}
              </span>
            )}
            <span>{assignment.submissions.length} учн.</span>
          </div>

          <h3 className="hw-section-title">Завдання</h3>
          <MarkdownView content={assignment.body_markdown} />

          {assignment.teacher_attachments.length > 0 && (
            <div className="hw-field" style={{ marginTop: 14 }}>
              <span className="hw-field-label">Файли викладача</span>
              <div className="hw-attachments">
                {assignment.teacher_attachments.map(a => (
                  <HomeworkFileLink key={a.id} url={a.url} label={a.filename} sizeBytes={a.size_bytes} />
                ))}
              </div>
            </div>
          )}

          {submission && (
            <>
              <h3 className="hw-section-title" style={{ marginTop: 18 }}>
                Учень: {submission.student_name}
              </h3>
              <div style={{ marginBottom: 10 }}>
                <Badge variant={homeworkStatusVariant(submission.status)}>
                  {HOMEWORK_STATUS_LABELS[submission.status]}
                </Badge>
              </div>

              {submission.student_answer_md ? (
                <>
                  <h4 className="hw-section-subtitle">Відповідь учня</h4>
                  <MarkdownView content={submission.student_answer_md} />
                </>
              ) : submission.status === 'assigned' || submission.status === 'viewed' ? (
                <p className="hw-modal-hint">Учень ще не позначив завдання виконаним</p>
              ) : null}

              {submission.student_file_url && (
                <div className="hw-field" style={{ marginTop: 12 }}>
                  <HomeworkFileLink url={submission.student_file_url} label={submission.student_file_url} />
                </div>
              )}

              {submission.teacher_review_note && (
                <>
                  <h4 className="hw-section-subtitle">Ваш коментар</h4>
                  <MarkdownView content={submission.teacher_review_note} />
                </>
              )}
            </>
          )}

          {!submission && assignment.submissions.length > 0 && (
            <div className="hw-detail-students">
              <h3 className="hw-section-title">Учні</h3>
              {assignment.submissions.map(sub => (
                <div key={sub.id} className="hw-teacher-sub-row">
                  <div>
                    <div className="admin-table-title">{sub.student_name}</div>
                    <Badge variant={homeworkStatusVariant(sub.status)}>
                      {HOMEWORK_STATUS_LABELS[sub.status]}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="hw-modal-footer hw-modal-footer--stack">
          {submission?.status === 'completed' && onReview ? (
            <button type="button" className="btn btn-teal btn-full" onClick={() => onReview(submission)}>
              Перевірити відповідь
            </button>
          ) : null}
          <div className="hw-modal-footer-row">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Закрити</button>
            <button type="button" className="btn btn-secondary" onClick={onEdit}>
              <EditIcon style={{ width: 16, height: 16, marginRight: 6 }} />
              Редагувати
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
