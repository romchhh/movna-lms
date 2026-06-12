'use client'

import { assignmentSubmissionProgress, type HomeworkAssignment } from '@/lib/homework-api'

export function HomeworkSubmissionProgress({ assignment }: { assignment: HomeworkAssignment }) {
  const { total, reviewed, pending, waiting } = assignmentSubmissionProgress(assignment)
  if (total <= 1) return null

  const parts: string[] = []
  if (pending > 0) parts.push(`${pending} на перевірці`)
  if (waiting > 0) parts.push(`${waiting} не здали`)
  if (reviewed > 0) parts.push(`${reviewed} готово`)

  return (
    <div className="hw-progress">
      <div className="hw-progress-labels">
        <span>{total} учн.</span>
        <span>{parts.join(' · ') || '—'}</span>
      </div>
      <div
        className="hw-progress-bar"
        role="progressbar"
        aria-valuenow={reviewed}
        aria-valuemin={0}
        aria-valuemax={total}
      >
        <div
          className="hw-progress-fill"
          style={{ width: `${total > 0 ? Math.round((reviewed / total) * 100) : 0}%` }}
        />
      </div>
    </div>
  )
}
