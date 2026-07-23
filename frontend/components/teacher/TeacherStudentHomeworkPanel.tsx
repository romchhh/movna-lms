'use client'

import { HomeworkAssignModal } from '@/components/homework/HomeworkAssignModal'
import { HomeworkCreateWizard } from '@/components/homework/HomeworkCreateWizard'
import { HomeworkReviewModal } from '@/components/homework/HomeworkReviewModal'
import { HomeworkTeacherDetailModal } from '@/components/homework/HomeworkTeacherDetailModal'
import { AddButtonLabel } from '@/components/shared/AddButtonLabel'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Empty } from '@/components/shared/UI'
import {
  homeworkApi,
  type HomeworkAssignment,
  type HomeworkSubmission,
} from '@/lib/homework-api'
import {
  assignmentLessonWhen,
  assignmentToCalendarEvent,
  displayAssignmentTitle,
  teacherStudentStatusLabel,
} from '@/lib/homework-utils'
import { statusMetaByLabel } from '@/lib/status-ui'
import { useCallback, useEffect, useMemo, useState } from 'react'

interface TeacherStudentHomeworkPanelProps {
  studentOptimateId: string
  studentName: string
}

function assignmentForStudent(assignment: HomeworkAssignment, studentId: string): HomeworkSubmission | undefined {
  return assignment.submissions.find(s => s.student_optimate_id === studentId)
}

export function TeacherStudentHomeworkPanel({
  studentOptimateId,
  studentName,
}: TeacherStudentHomeworkPanelProps) {
  const [items, setItems] = useState<HomeworkAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [reviewSub, setReviewSub] = useState<HomeworkSubmission | null>(null)
  const [viewContext, setViewContext] = useState<{
    assignment: HomeworkAssignment
    submission?: HomeworkSubmission
  } | null>(null)
  const [editAssignment, setEditAssignment] = useState<HomeworkAssignment | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const all = await homeworkApi.teacherList('all')
      setItems(
        all.filter(a => assignmentForStudent(a, studentOptimateId) != null),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка')
    } finally {
      setLoading(false)
    }
  }, [studentOptimateId])

  useEffect(() => {
    load()
  }, [load])

  const sorted = useMemo(
    () => [...items].sort((a, b) => b.event_starts_at.localeCompare(a.event_starts_at)),
    [items],
  )

  return (
    <section className="stc-panel teacher-student-hw-panel">
      <div className="stc-panel-head">
        <div>
          <h3>Домашні завдання</h3>
          <p className="stc-panel-sub">Призначення та перевірка ДЗ для цього учня</p>
        </div>
        <button type="button" className="btn btn-sm btn-teal" onClick={() => setCreateOpen(true)}>
          <AddButtonLabel>Додати ДЗ</AddButtonLabel>
        </button>
      </div>

      {error && <div className="alert">{error}</div>}
      {loading && <Empty label="Завантаження домашніх…" />}

      {!loading && sorted.length === 0 && (
        <Empty label="Домашніх завдань ще немає" />
      )}

      {!loading && sorted.length > 0 && (
        <div className="teacher-student-hw-list">
          {sorted.map(assignment => {
            const sub = assignmentForStudent(assignment, studentOptimateId)!
            const status = teacherStudentStatusLabel(sub)
            return (
              <div key={assignment.id} className="teacher-student-hw-row">
                <div className="teacher-student-hw-row-main">
                  <div className="teacher-student-hw-title">{displayAssignmentTitle(assignment)}</div>
                  <div className="teacher-student-hw-meta">{assignmentLessonWhen(assignment)}</div>
                </div>
                <StatusBadge
                  label={status}
                  meta={statusMetaByLabel(status)}
                  variant={sub.status === 'completed' ? 'amber' : sub.status === 'reviewed' ? 'green' : 'gray'}
                />
                <div className="teacher-student-hw-actions">
                  {sub.status === 'completed' && (
                    <button type="button" className="btn btn-sm btn-teal" onClick={() => setReviewSub(sub)}>
                      Перевірити
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={() => setViewContext({ assignment, submission: sub })}
                  >
                    Відкрити
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {createOpen && (
        <HomeworkCreateWizard
          initialStudent={{ id: studentOptimateId, full_name: studentName }}
          onClose={() => setCreateOpen(false)}
          onSaved={() => {
            setCreateOpen(false)
            load()
          }}
        />
      )}

      {reviewSub && (
        <HomeworkReviewModal
          submission={reviewSub}
          onClose={() => setReviewSub(null)}
          onReviewed={() => {
            setReviewSub(null)
            load()
          }}
        />
      )}

      {viewContext && (
        <HomeworkTeacherDetailModal
          assignment={viewContext.assignment}
          submission={viewContext.submission}
          onClose={() => setViewContext(null)}
          onEdit={() => {
            setEditAssignment(viewContext.assignment)
            setViewContext(null)
          }}
          onReview={sub => {
            setViewContext(null)
            setReviewSub(sub)
          }}
        />
      )}

      {editAssignment && (
        <HomeworkAssignModal
          event={assignmentToCalendarEvent(editAssignment)}
          existing={editAssignment}
          onClose={() => setEditAssignment(null)}
          onSaved={() => {
            setEditAssignment(null)
            load()
          }}
        />
      )}
    </section>
  )
}
