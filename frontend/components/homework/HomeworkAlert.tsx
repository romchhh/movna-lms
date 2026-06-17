'use client'

import { HomeworkNavIcon } from '@/components/shared/NavIcons'
import {
  filterStudentHomework,
  studentHomeworkCounts,
  type HomeworkStudentItem,
} from '@/lib/homework-api'
import { useStudentHomework } from '@/hooks/useStudentHomework'
import Link from 'next/link'

interface HomeworkAlertProps {
  onOpen?: (submissionId: number) => void
}

export function HomeworkAlert({ onOpen }: HomeworkAlertProps) {
  const { items } = useStudentHomework()
  const counts = studentHomeworkCounts(items)
  const active = filterStudentHomework(items, 'active')
  const withFeedback = items.filter(i => i.status === 'reviewed' && i.teacher_review_note.trim())

  if (active.length === 0 && withFeedback.length === 0) return null

  return (
    <>
      {active.length > 0 && (
        <div className="hw-alert">
          <div className="hw-alert-body">
            <strong className="hw-alert-title">
              <HomeworkNavIcon />
              {active.length} незавершен{active.length === 1 ? 'е' : 'их'} завдання
            </strong>
            <p>
              {active.length === 1
                ? active[0].title
                : `${active[0].title} та ще ${active.length - 1}`}
            </p>
          </div>
          {active.length === 1 && onOpen ? (
            <button
              type="button"
              className="btn btn-sm btn-teal"
              onClick={() => onOpen(active[0].submission_id)}
            >
              Відкрити
            </button>
          ) : (
            <Link href="/student/homework?tab=active" className="btn btn-sm btn-teal">
              Переглянути всі
            </Link>
          )}
        </div>
      )}
      {withFeedback.length > 0 && (
        <div className="hw-alert hw-alert--feedback">
          <div className="hw-alert-body">
            <strong className="hw-alert-title">
              <HomeworkNavIcon />
              Є коментар від викладача
            </strong>
            <p>
              {withFeedback.length === 1
                ? withFeedback[0].title
                : `${withFeedback.length} перевірених завдань`}
            </p>
          </div>
          {withFeedback.length === 1 && onOpen ? (
            <button
              type="button"
              className="btn btn-sm btn-teal"
              onClick={() => onOpen(withFeedback[0].submission_id)}
            >
              Читати
            </button>
          ) : (
            <Link href="/student/homework?tab=done" className="btn btn-sm btn-teal">
              Переглянути
            </Link>
          )}
        </div>
      )}
    </>
  )
}
