'use client'

import { TeacherStudentDetailModal } from '@/components/teacher/TeacherStudentDetailModal'
import { Badge, Card, Empty, PageHeader, Pagination } from '@/components/shared/UI'
import { TeacherStudent, teacherOptimateApi } from '@/lib/teacher-optimate-api'
import { useCallback, useEffect, useMemo, useState } from 'react'

const PAGE_SIZE = 50

function statusBadgeVariant(status: number): 'teal' | 'gray' | 'amber' | 'purple' {
  if (status === 1) return 'teal'
  if (status === 2) return 'gray'
  if (status === 3) return 'purple'
  if (status === 4) return 'amber'
  return 'gray'
}

function studentInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export default function TeacherStudentsPage() {
  const [students, setStudents] = useState<TeacherStudent[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedTitle, setSelectedTitle] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350)
    return () => clearTimeout(t)
  }, [search])

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

  const activeCount = useMemo(
    () => students.filter(s => s.status === 1).length,
    [students],
  )

  function openStudent(student: TeacherStudent) {
    setSelectedId(student.id)
    setSelectedTitle(student.full_name)
  }

  return (
    <>
      <PageHeader
        title="Мої учні"
        sub={loading ? 'Завантаження з Optimate...' : `${total} учнів · ${activeCount} активних на стор. ${page}`}
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
        {!loading && students.length === 0 && <Empty label="Учнів не знайдено" />}

        {!loading && students.map(student => (
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
