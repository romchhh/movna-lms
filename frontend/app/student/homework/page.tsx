'use client'

import { HomeworkStudentModal } from '@/components/homework/HomeworkStudentModal'
import { FilterChipBar } from '@/components/shared/FilterChipBar'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Empty, PageHeader } from '@/components/shared/UI'
import { useStudentHomework } from '@/hooks/useStudentHomework'
import { formatEventDateFull } from '@/lib/calendar-utils'
import {
  filterStudentHomework,
  formatHomeworkDeadline,
  HOMEWORK_STUDENT_STATUS_LABELS,
  isHomeworkOverdue,
  sortStudentHomework,
  studentHomeworkCounts,
  studentHomeworkCta,
  type StudentHomeworkFilter,
} from '@/lib/homework-api'
import { homeworkStatusMeta } from '@/lib/status-ui'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useMemo, useState } from 'react'

const FILTER_LABELS: Record<StudentHomeworkFilter, string> = {
  active: 'Зробити',
  pending: 'Відправлені',
  done: 'Перевірені',
}

const FILTER_EMOJI: Record<StudentHomeworkFilter, string> = {
  active: '📝',
  pending: '📤',
  done: '✅',
}

const FILTER_ACCENT: Record<StudentHomeworkFilter, 'red' | 'teal' | 'green'> = {
  active: 'red',
  pending: 'teal',
  done: 'green',
}

const EMPTY_LABELS: Record<StudentHomeworkFilter, string> = {
  active: 'Немає завдань — все зроблено',
  pending: 'Немає відправлених завдань',
  done: 'Перевірених завдань ще немає',
}

function StudentHomeworkContent() {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab') as StudentHomeworkFilter | null
  const openParam = searchParams.get('id')

  const { items, loading, error, reload } = useStudentHomework()
  const [filter, setFilter] = useState<StudentHomeworkFilter>('active')
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const counts = useMemo(() => studentHomeworkCounts(items), [items])

  useEffect(() => {
    if (tabParam && ['active', 'pending', 'done'].includes(tabParam)) {
      setFilter(tabParam)
    } else if (counts.active > 0) {
      setFilter('active')
    }
  }, [tabParam, counts.active])

  useEffect(() => {
    if (openParam) {
      const id = Number(openParam)
      if (!Number.isNaN(id)) setSelectedId(id)
    }
  }, [openParam])

  const visible = useMemo(
    () => sortStudentHomework(filterStudentHomework(items, filter)),
    [items, filter],
  )

  return (
    <>
      <PageHeader
        title="Домашні завдання"
        sub={loading ? '…' : counts.active > 0 ? `${counts.active} потрібно зробити` : 'Все здано'}
      />

      {error && <div className="alert">{error}</div>}

      {!loading && items.length > 0 && (
        <div className="admin-filters hw-page-filters">
          <FilterChipBar
            value={filter}
            onChange={setFilter}
            accent="teal"
            showCounts
            chips={(['active', 'pending', 'done'] as const).map(key => ({
              key,
              label: FILTER_LABELS[key],
              emoji: FILTER_EMOJI[key],
              accent: FILTER_ACCENT[key],
              count: counts[key],
            }))}
          />
        </div>
      )}

      {loading && <Empty label="Завантаження..." />}
      {!loading && items.length === 0 && (
        <Empty label="Домашніх завдань немає" />
      )}
      {!loading && items.length > 0 && visible.length === 0 && (
        <Empty label={EMPTY_LABELS[filter]} />
      )}

      <div className="hw-student-list">
        {visible.map(item => {
          const cta = studentHomeworkCta(item.status)
          const isTodo = item.status === 'assigned' || item.status === 'viewed'
          return (
            <article
              key={item.submission_id}
              className={`hw-student-card-simple${isTodo ? ' hw-student-card-simple--todo' : ''}`}
            >
              <div className="hw-student-card-main">
                <div className="hw-student-card-text">
                  <div className="hw-student-row-top">
                    <h3 className="hw-row-title">{item.title}</h3>
                    <StatusBadge
                      label={HOMEWORK_STUDENT_STATUS_LABELS[item.status]}
                      meta={homeworkStatusMeta(item.status)}
                    />
                    {isHomeworkOverdue(item.deadline_at, item.status) && (
                      <StatusBadge label="Прострочено" variant="red" emoji="⚠️" />
                    )}
                  </div>
                  {item.event_title && (
                    <p className="hw-row-lesson">
                      {item.event_title} · {formatEventDateFull(item.event_starts_at)}
                    </p>
                  )}
                  <p className="hw-row-meta">
                    {item.deadline_at && `До ${formatHomeworkDeadline(item.deadline_at)}`}
                    {item.status === 'reviewed' && item.teacher_review_note && (
                      <span className="hw-row-feedback"> · є коментар викладача</span>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  className={`btn btn-sm ${isTodo ? 'btn-teal' : 'btn-secondary'}`}
                  onClick={() => setSelectedId(item.submission_id)}
                >
                  {cta}
                </button>
              </div>
            </article>
          )
        })}
      </div>

      <HomeworkStudentModal
        submissionId={selectedId}
        onClose={() => setSelectedId(null)}
        onUpdated={reload}
      />
    </>
  )
}

export default function StudentHomework() {
  return (
    <Suspense fallback={<Empty label="Завантаження..." />}>
      <StudentHomeworkContent />
    </Suspense>
  )
}
