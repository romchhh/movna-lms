'use client'

import { HomeworkSubmissionProgress } from '@/components/homework/HomeworkSubmissionProgress'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Badge } from '@/components/shared/UI'
import { EditIcon, IconButton } from '@/components/shared/Icons'
import type { HomeworkAssignment, HomeworkSubmission } from '@/lib/homework-api'
import { assignmentCardStatus, assignmentLessonWhen, displayAssignmentTitle, displayStudentName, teacherStudentStatusLabel } from '@/lib/homework-utils'
import { statusMetaByLabel } from '@/lib/status-ui'
import { useState } from 'react'

interface HomeworkTeacherCardProps {
  assignment: HomeworkAssignment
  onView: (submission?: HomeworkSubmission) => void
  onEdit: () => void
  onReview: (submission: HomeworkSubmission) => void
}

function StudentRow({
  sub,
  onView,
  onReview,
}: {
  sub: HomeworkSubmission
  onView: () => void
  onReview: () => void
}) {
  const name = displayStudentName(sub.student_name)
  const status = teacherStudentStatusLabel(sub)

  if (sub.status === 'completed') {
    return (
      <div className="hw-teacher-action-row hw-teacher-action-row--urgent">
        <div className="hw-teacher-action-main">
          <span className="hw-row-title">{name}</span>
          <span className="hw-row-meta">{status}</span>
        </div>
        <button type="button" className="btn btn-sm btn-teal" onClick={onReview}>
          Перевірити
        </button>
      </div>
    )
  }

  if (sub.status === 'reviewed') {
    return (
      <div className="hw-teacher-action-row hw-teacher-action-row--done">
        <div className="hw-teacher-action-main">
          <span className="hw-row-title">{name}</span>
          <Badge variant="green">{statusMetaByLabel(status).emoji} {status}</Badge>
        </div>
        <button type="button" className="btn btn-sm btn-secondary" onClick={onView}>
          Відкрити
        </button>
      </div>
    )
  }

  return (
    <div className="hw-teacher-action-row">
      <div className="hw-teacher-action-main">
        <span className="hw-row-title">{name}</span>
        <span className="hw-row-meta hw-row-meta--warn">{status}</span>
      </div>
      <button type="button" className="btn btn-sm btn-secondary" onClick={onView}>
        ДЗ
      </button>
    </div>
  )
}

export function HomeworkTeacherCard({
  assignment,
  onView,
  onEdit,
  onReview,
}: HomeworkTeacherCardProps) {
  const [showDone, setShowDone] = useState(false)

  const toReview = assignment.submissions.filter(s => s.status === 'completed')
  const waiting = assignment.submissions.filter(s => s.status === 'assigned' || s.status === 'viewed')
  const done = assignment.submissions.filter(s => s.status === 'reviewed')
  const multi = assignment.submissions.length > 1
  const allDone = done.length > 0 && done.length === assignment.submissions.length
  const cardStatus = assignmentCardStatus(assignment)
  const title = displayAssignmentTitle(assignment)

  return (
    <article className={`hw-teacher-card-simple${allDone ? ' hw-teacher-card-simple--done' : ''}`}>
      <button type="button" className="hw-teacher-card-head" onClick={() => onView()}>
        <div className="hw-teacher-card-head-text">
          <h3 className="hw-row-title">{title}</h3>
          <p className="hw-card-meta">{assignmentLessonWhen(assignment)}</p>
        </div>
        <StatusBadge label={cardStatus.label} meta={statusMetaByLabel(cardStatus.label)} variant={cardStatus.variant} />
      </button>

      <HomeworkSubmissionProgress assignment={assignment} />

      {(toReview.length > 0 || waiting.length > 0 || (!multi && done.length > 0)) && (
        <div className="hw-teacher-card-body">
          {toReview.map(sub => (
            <StudentRow
              key={sub.id}
              sub={sub}
              onView={() => onView(sub)}
              onReview={() => onReview(sub)}
            />
          ))}

          {waiting.map(sub => (
            <StudentRow
              key={sub.id}
              sub={sub}
              onView={() => onView(sub)}
              onReview={() => onReview(sub)}
            />
          ))}

          {!multi && done.map(sub => (
            <StudentRow
              key={sub.id}
              sub={sub}
              onView={() => onView(sub)}
              onReview={() => onReview(sub)}
            />
          ))}

          {multi && done.length > 0 && (
            <div className="hw-teacher-done-block">
              <button
                type="button"
                className="hw-teacher-done-toggle"
                onClick={() => setShowDone(v => !v)}
              >
                {showDone ? 'Згорнути' : `Перевірені учні (${done.length})`}
              </button>
              {showDone && done.map(sub => (
                <StudentRow
                  key={sub.id}
                  sub={sub}
                  onView={() => onView(sub)}
                  onReview={() => onReview(sub)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="hw-teacher-card-foot">
        <button type="button" className="btn btn-sm btn-secondary" onClick={() => onView()}>
          Текст завдання
        </button>
        <IconButton label="Редагувати ДЗ" variant="ghost" onClick={onEdit}>
          <EditIcon />
        </IconButton>
      </div>
    </article>
  )
}
