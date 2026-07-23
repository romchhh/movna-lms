'use client'

import { TeacherStudentCardActions } from '@/components/teacher/TeacherStudentCardActions'
import { FilterChipBar } from '@/components/shared/FilterChipBar'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { Card, Empty, PageHeader, Pagination } from '@/components/shared/UI'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useLmsProfiles } from '@/hooks/useLmsProfiles'
import { TeacherStudent, teacherOptimateApi } from '@/lib/teacher-optimate-api'
import { teacherStudentPagePath } from '@/lib/teacher-student-routes'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'

const PAGE_SIZE = 50

type StatusFilter = 'all' | '1' | '2' | '3' | '4' | '5'

const STATUS_FILTERS: { key: StatusFilter; label: string; emoji: string; accent: 'gray' | 'teal' | 'purple' | 'amber' | 'red' }[] = [
  { key: 'all', label: 'Всі', emoji: '📋', accent: 'gray' },
  { key: '1', label: 'Активні', emoji: '✅', accent: 'teal' },
  { key: '3', label: 'Нові', emoji: '✨', accent: 'purple' },
  { key: '4', label: 'На паузі', emoji: '⏸️', accent: 'amber' },
  { key: '5', label: 'Очікування', emoji: '⏳', accent: 'amber' },
  { key: '2', label: 'Архів', emoji: '📦', accent: 'gray' },
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

  const studentIds = useMemo(() => filtered.map(s => s.id), [filtered])
  useLmsProfiles(studentIds)

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
            emoji: f.emoji,
            accent: f.accent,
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
          <span>Дії</span>
          <span>Статус</span>
        </div>

        {loading && <Empty label="Завантаження..." />}
        {!loading && filtered.length === 0 && (
          <Empty label={students.length === 0 ? 'Учнів не знайдено' : 'Немає учнів з обраним статусом'} />
        )}

        {!loading && filtered.map(student => (
          <div key={student.id} className="teacher-students-row">
            <Link
              href={teacherStudentPagePath(student.id)}
              className="teacher-students-row-main teacher-students-row--clickable"
            >
              <div className="teacher-students-main">
                <UserAvatar name={student.full_name} optimateId={student.id} size="lg" kind="student" />
                <div>
                  <div className="admin-table-title">
                    {student.full_name}
                    {student.is_speaking_club_only && (
                      <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--tx3)' }}>SC</span>
                    )}
                  </div>
                  <div className="admin-table-sub">
                    {student.is_speaking_club_only
                      ? 'Speaking Club'
                      : (student.product_names[0] || student.email || student.phone || `ID ${student.id}`)}
                  </div>
                </div>
              </div>
            </Link>
            <div>
              <StatusBadge label={student.skill_level_label || '—'} variant="purple" emoji="📊" />
            </div>
            <div>
              <StatusBadge
                label={student.is_speaking_club_only ? 'SC' : String(student.remaining_lessons)}
                variant={
                  student.is_speaking_club_only
                    ? 'gray'
                    : student.remaining_lessons <= 2
                      ? 'red'
                      : student.remaining_lessons <= 4
                        ? 'amber'
                        : 'green'
                }
                emoji={student.is_speaking_club_only ? '🎤' : student.remaining_lessons <= 2 ? '⚠️' : '💳'}
              />
            </div>
            <div>
              <TeacherStudentCardActions
                studentId={student.id}
                studentName={student.full_name}
                compact
              />
            </div>
            <div>
              <StatusBadge label={student.status_label} status={student.status} />
            </div>
          </div>
        ))}
      </Card>

      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
    </>
  )
}
