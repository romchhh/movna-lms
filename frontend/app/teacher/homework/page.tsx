'use client'

import { HomeworkAssignModal } from '@/components/homework/HomeworkAssignModal'
import { HomeworkCreateWizard } from '@/components/homework/HomeworkCreateWizard'
import { HomeworkPendingAlert } from '@/components/homework/HomeworkPendingAlert'
import { HomeworkReviewModal } from '@/components/homework/HomeworkReviewModal'
import { HomeworkTeacherCard } from '@/components/homework/HomeworkTeacherCard'
import { HomeworkTeacherDetailModal } from '@/components/homework/HomeworkTeacherDetailModal'
import { FilterChipBar } from '@/components/shared/FilterChipBar'
import { Empty, PageHeader } from '@/components/shared/UI'
import {
  filterTeacherHomework,
  homeworkApi,
  teacherHomeworkCounts,
  type HomeworkAssignment,
  type HomeworkSubmission,
} from '@/lib/homework-api'
import { assignmentToCalendarEvent } from '@/lib/homework-utils'
import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

type Filter = 'all' | 'to_review' | 'reviewed'

const FILTER_LABELS: Record<Filter, string> = {
  all: 'Усі',
  to_review: 'Перевірити',
  reviewed: 'Готово',
}

export default function TeacherHomework() {
  const searchParams = useSearchParams()
  const filterParam = searchParams.get('filter') as Filter | null

  const [filter, setFilter] = useState<Filter>('to_review')
  const [allItems, setAllItems] = useState<HomeworkAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reviewSub, setReviewSub] = useState<HomeworkSubmission | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [editAssignment, setEditAssignment] = useState<HomeworkAssignment | null>(null)
  const [viewContext, setViewContext] = useState<{
    assignment: HomeworkAssignment
    submission?: HomeworkSubmission
  } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setAllItems(await homeworkApi.teacherList('all'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (filterParam && ['all', 'to_review', 'reviewed'].includes(filterParam)) {
      setFilter(filterParam)
    }
  }, [filterParam])

  const counts = useMemo(() => teacherHomeworkCounts(allItems), [allItems])
  const items = useMemo(() => filterTeacherHomework(allItems, filter), [allItems, filter])

  useEffect(() => {
    if (!filterParam && counts.pendingSubs > 0) {
      setFilter('to_review')
    }
  }, [counts.pendingSubs, filterParam])

  function openEdit(assignment: HomeworkAssignment) {
    setViewContext(null)
    setEditAssignment(assignment)
  }

  function openReview(sub: HomeworkSubmission) {
    setViewContext(null)
    setReviewSub(sub)
  }

  const emptyLabel = filter === 'to_review'
    ? 'Немає відповідей на перевірці — все зроблено'
    : filter === 'reviewed'
      ? 'Перевірених ДЗ ще немає'
      : 'ДЗ не знайдено'

  return (
    <>
      <PageHeader title="Домашні завдання" sub="Перевірка та призначення">
        <button type="button" className="btn btn-teal" onClick={() => setCreateOpen(true)}>
          + Додати ДЗ
        </button>
      </PageHeader>

      <HomeworkPendingAlert onReview={() => setFilter('to_review')} />

      {error && <div className="alert">{error}</div>}

      {!loading && allItems.length > 0 && (
        <div className="admin-filters hw-page-filters">
          <FilterChipBar
            value={filter}
            onChange={setFilter}
            accent="teal"
            showCounts
            chips={(['to_review', 'all', 'reviewed'] as const).map(key => ({
              key,
              label: FILTER_LABELS[key],
              count: key === 'all' ? counts.all : key === 'to_review' ? counts.to_review : counts.reviewed,
            }))}
          />
        </div>
      )}

      {loading && <Empty label="Завантаження..." />}
      {!loading && items.length === 0 && (
        <div className="hw-empty-create">
          <Empty label={emptyLabel} />
          {filter !== 'to_review' && (
            <button type="button" className="btn btn-teal btn-sm" onClick={() => setCreateOpen(true)}>
              Додати ДЗ
            </button>
          )}
        </div>
      )}

      <div className="hw-teacher-list">
        {items.map(assignment => (
          <HomeworkTeacherCard
            key={assignment.id}
            assignment={assignment}
            onView={sub => setViewContext({ assignment, submission: sub })}
            onEdit={() => openEdit(assignment)}
            onReview={openReview}
          />
        ))}
      </div>

      {createOpen && (
        <HomeworkCreateWizard
          onClose={() => setCreateOpen(false)}
          onSaved={load}
        />
      )}

      {viewContext && (
        <HomeworkTeacherDetailModal
          assignment={viewContext.assignment}
          submission={viewContext.submission}
          onClose={() => setViewContext(null)}
          onEdit={() => openEdit(viewContext.assignment)}
          onReview={openReview}
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
    </>
  )
}
