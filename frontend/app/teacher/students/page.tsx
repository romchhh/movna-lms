'use client'

import { TeacherStudentDetailModal } from '@/components/teacher/TeacherStudentDetailModal'
import { FilterChipBar } from '@/components/shared/FilterChipBar'
import { Badge, Card, Empty, PageHeader, Pagination } from '@/components/shared/UI'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { statusBadgeVariant, studentInitials } from '@/lib/optimate-ui'
import { TeacherStudent, teacherOptimateApi } from '@/lib/teacher-optimate-api'
import { useCallback, useEffect, useMemo, useState } from 'react'

const PAGE_SIZE = 50

type StatusFilter = 'all' | '1' | '2' | '3' | '4' | '5'

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'Всі' },
  { key: '1', label: 'Активні' },
  { key: '3', label: 'Нові' },
  { key: '4', label: 'На паузі' },
  { key: '5', label: 'Очікування' },
  { key: '2', label: 'Архів' },
]

export default function TeacherStudentsPage() {
  const [students, setStudents] = useState<TeacherStudent[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedTitle, setSelectedTitle] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await teacherOptimateApi.students(page, PAGE_SIZE, debouncedSearch)
      setStudents(res.data)
      setTotal(res.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка завантаження')
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return students
    const status = Number(statusFilter)
    return students.filter(s => s.status === status)
  }, [students, statusFilter])

  const statusCounts = useMemo(() => {
    const counts: Record<number, number> = {}
    for (const s of students) {
      counts[s.status] = (counts[s.status] ?? 0) + 1
    }
    return counts
  }, [students])

  const pageSubtitle = useMemo(() => {
    if (loading) return 'Завантаження з Optimate...'
    const filterLabel = STATUS_FILTERS.find(f => f.key === statusFilter)?.label ?? ''
    if (statusFilter === 'all') {
      return `${total} учнів · стор. ${page}`
    }
    return `${filtered.length} ${filterLabel.toLowerCase()} · ${total} учнів · стор. ${page}`
  }, [loading, total, page, statusFilter, filtered.length])

  function openStudent(student: TeacherStudent) {
    setSelectedId(student.id)
    setSelectedTitle(student.full_name)
  }

  return (
    <>
      <PageHeader
        title="Мої учні"
        sub={pageSubtitle}
      />

      {error && <div className="alert">{error}</div>}

      <div className="admin-filters">
        <input
          className="input"
          placeholder="Пошук за ім'ям..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          style={{ maxWidth: 280 }}
        />
        <FilterChipBar
          value={statusFilter}
          onChange={setStatusFilter}
          accent="teal"
          showCounts
          chips={STATUS_FILTERS.map(f => ({
            key: f.key,
            label: f.label,
            count: loading
              ? undefined
              : f.key === 'all'
                ? students.length
                : statusCounts[Number(f.key)] ?? 0,
          }))}
        />
      </div>

      <Card>
        <div className="teacher-students-head">
          <span>Учень</span>
          <span>Рівень</span>
          <span>Баланс</span>
          <span>Продукти</span>
          <span>Статус</span>
        </div>

        {loading && <Empty label="Завантаження..." />}
        {!loading && filtered.length === 0 && (
          <Empty label={students.length === 0 ? 'Учнів не знайдено' : 'Немає учнів з обраним статусом'} />
        )}

        {!loading && filtered.map(student => (
          <button
            key={student.id}
            type="button"
            className="teacher-students-row teacher-students-row--clickable"
            onClick={() => openStudent(student)}
          >
            <div className="teacher-students-main">
              <div className="admin-teacher-avatar">{studentInitials(student.full_name)}</div>
              <div>
                <div className="admin-table-title">{student.full_name}</div>
                <div className="admin-table-sub">
                  {student.email || student.phone || `ID ${student.id}`}
                </div>
              </div>
            </div>
            <div>
              <Badge variant="purple">{student.skill_level_label || '—'}</Badge>
            </div>
            <div>
              <Badge
                variant={
                  student.remaining_lessons <= 2
                    ? 'red'
                    : student.remaining_lessons <= 4
                      ? 'amber'
                      : 'green'
                }
              >
                {student.remaining_lessons}
              </Badge>
            </div>
            <div className="admin-table-sub teacher-students-products">
              {student.product_names.length
                ? student.product_names.join(', ')
                : '—'}
            </div>
            <div>
              <Badge variant={statusBadgeVariant(student.status)}>{student.status_label}</Badge>
            </div>
          </button>
        ))}
      </Card>

      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />

      <TeacherStudentDetailModal
        studentId={selectedId}
        title={selectedTitle}
        onClose={() => setSelectedId(null)}
      />
    </>
  )
}
