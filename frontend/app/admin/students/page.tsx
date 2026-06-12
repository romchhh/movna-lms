'use client'

import { AdminOptimateSyncBar } from '@/components/admin/AdminOptimateSyncBar'
import { OptimateEntityModal } from '@/components/admin/OptimateEntityModal'
import { PageHeader, Badge, Card, Empty, Pagination } from '@/components/shared/UI'
import { FilterChipBar } from '@/components/shared/FilterChipBar'
import {
  StudentListItem,
  adminOptimateApi,
  zipStudentTeachers,
} from '@/lib/admin-optimate-api'
import { CacheMeta } from '@/lib/optimate-api'
import { statusBadgeVariant } from '@/lib/optimate-ui'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useCallback, useEffect, useMemo, useState } from 'react'

const PAGE_SIZE = 50

function StudentTeachersCell({
  student,
  onTeacherClick,
}: {
  student: StudentListItem
  onTeacherClick: (teacherId: string, teacherName: string) => void
}) {
  const teachers = zipStudentTeachers(student)
  if (!teachers.length) {
    return <div className="admin-table-sub">—</div>
  }

  return (
    <div className="admin-table-teachers">
      {teachers.map((teacher, index) => {
        const clickable = Boolean(teacher.id)
        if (!clickable) {
          return (
            <span key={`${teacher.name}-${index}`} className="admin-table-sub">
              {teacher.name}
            </span>
          )
        }
        return (
          <button
            key={teacher.id}
            type="button"
            className="cal-participant-chip cal-participant-chip--link"
            onClick={e => {
              e.stopPropagation()
              onTeacherClick(teacher.id, teacher.name)
            }}
          >
            {teacher.name}
          </button>
        )
      })}
    </div>
  )
}

export default function AdminStudents() {
  const [students, setStudents] = useState<StudentListItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [cache, setCache] = useState<CacheMeta | null>(null)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search)
  const [filter, setFilter] = useState<'all' | 'active' | 'low'>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [studentDetail, setStudentDetail] = useState<Record<string, unknown> | null>(null)
  const [studentDetailCache, setStudentDetailCache] = useState<CacheMeta | null>(null)
  const [studentDetailLoading, setStudentDetailLoading] = useState(false)
  const [studentDetailError, setStudentDetailError] = useState('')

  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null)
  const [teacherTitle, setTeacherTitle] = useState('')
  const [teacherDetail, setTeacherDetail] = useState<Record<string, unknown> | null>(null)
  const [teacherDetailCache, setTeacherDetailCache] = useState<CacheMeta | null>(null)
  const [teacherDetailLoading, setTeacherDetailLoading] = useState(false)
  const [teacherDetailError, setTeacherDetailError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await adminOptimateApi.students(page, PAGE_SIZE, debouncedSearch)
      setStudents(res.data)
      setTotal(res.total)
      setCache(res.cache)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка')
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => students.filter(s => {
    if (filter === 'active') return s.status === 1
    if (filter === 'low') return s.remaining_lessons <= 2
    return true
  }), [students, filter])

  async function openStudentDetail(id: string) {
    setSelectedStudentId(id)
    setStudentDetail(null)
    setStudentDetailError('')
    setStudentDetailLoading(true)
    try {
      const res = await adminOptimateApi.studentDetail(id)
      setStudentDetail(res.data)
      setStudentDetailCache(res.cache)
    } catch (err) {
      setStudentDetailError(err instanceof Error ? err.message : 'Помилка')
    } finally {
      setStudentDetailLoading(false)
    }
  }

  async function refreshStudentDetail() {
    if (!selectedStudentId) return
    setStudentDetailLoading(true)
    setStudentDetailError('')
    try {
      const res = await adminOptimateApi.studentDetail(selectedStudentId, true)
      setStudentDetail(res.data)
      setStudentDetailCache(res.cache)
    } catch (err) {
      setStudentDetailError(err instanceof Error ? err.message : 'Помилка')
    } finally {
      setStudentDetailLoading(false)
    }
  }

  async function openTeacherDetail(id: string, name: string) {
    setSelectedTeacherId(id)
    setTeacherTitle(name)
    setTeacherDetail(null)
    setTeacherDetailError('')
    setTeacherDetailLoading(true)
    try {
      const res = await adminOptimateApi.teacherDetail(id)
      setTeacherDetail(res.data)
      setTeacherDetailCache(res.cache)
      const fullName = String(res.data.full_name ?? '')
      if (fullName) setTeacherTitle(fullName)
    } catch (err) {
      setTeacherDetailError(err instanceof Error ? err.message : 'Помилка')
    } finally {
      setTeacherDetailLoading(false)
    }
  }

  async function refreshTeacherDetail() {
    if (!selectedTeacherId) return
    setTeacherDetailLoading(true)
    setTeacherDetailError('')
    try {
      const res = await adminOptimateApi.teacherDetail(selectedTeacherId, true)
      setTeacherDetail(res.data)
      setTeacherDetailCache(res.cache)
    } catch (err) {
      setTeacherDetailError(err instanceof Error ? err.message : 'Помилка')
    } finally {
      setTeacherDetailLoading(false)
    }
  }

  const selectedStudent = students.find(s => s.id === selectedStudentId)

  return (
    <>
      <PageHeader
        title="Учні"
        sub={loading ? 'Завантаження з Optimate...' : `${total} в Optimate · стор. ${page}`}
      />

      {error && <div className="alert">{error}</div>}
      <AdminOptimateSyncBar cache={cache} onRefreshed={load} />

      <div className="admin-filters">
        <input
          className="input"
          placeholder="Пошук за ім'ям..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          style={{ maxWidth: 280 }}
        />
        <FilterChipBar
          value={filter}
          onChange={f => setFilter(f)}
          chips={[
            { key: 'all', label: 'Всі' },
            { key: 'active', label: 'Активні' },
            { key: 'low', label: 'Малий баланс' },
          ]}
        />
      </div>

      <Card>
        <div className="admin-table-head admin-table-head--students">
          <span>Учень</span>
          <span>Викладачі</span>
          <span>Рівень</span>
          <span>Баланс</span>
          <span>Продукти</span>
          <span>Статус</span>
        </div>

        {loading && <Empty label="Завантаження..." />}
        {!loading && filtered.length === 0 && <Empty label="Нічого не знайдено" />}

        {filtered.map(s => (
          <div
            key={s.id}
            className="admin-table-row admin-table-row--students"
          >
            <div
              className="admin-table-cell admin-table-cell--clickable"
              role="button"
              tabIndex={0}
              onClick={() => openStudentDetail(s.id)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  openStudentDetail(s.id)
                }
              }}
            >
              <div className="admin-table-title">{s.full_name}</div>
              <div className="admin-table-sub">{s.email || s.phone || `ID ${s.id}`}</div>
            </div>
            <div className="admin-table-cell">
              <StudentTeachersCell student={s} onTeacherClick={openTeacherDetail} />
            </div>
            <div
              className="admin-table-cell admin-table-cell--clickable"
              role="button"
              tabIndex={0}
              onClick={() => openStudentDetail(s.id)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  openStudentDetail(s.id)
                }
              }}
            >
              <Badge variant="purple">{s.skill_level_label || '—'}</Badge>
            </div>
            <div
              className="admin-table-cell admin-table-cell--clickable"
              role="button"
              tabIndex={0}
              onClick={() => openStudentDetail(s.id)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  openStudentDetail(s.id)
                }
              }}
            >
              <Badge variant={s.remaining_lessons <= 2 ? 'red' : s.remaining_lessons <= 4 ? 'amber' : 'green'}>
                {s.remaining_lessons}
              </Badge>
            </div>
            <div
              className="admin-table-cell admin-table-cell--clickable"
              role="button"
              tabIndex={0}
              onClick={() => openStudentDetail(s.id)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  openStudentDetail(s.id)
                }
              }}
            >
              <div className="admin-table-sub">{s.product_count}</div>
            </div>
            <div
              className="admin-table-cell admin-table-cell--clickable"
              role="button"
              tabIndex={0}
              onClick={() => openStudentDetail(s.id)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  openStudentDetail(s.id)
                }
              }}
            >
              <Badge variant={statusBadgeVariant(s.status)}>{s.status_label}</Badge>
            </div>
          </div>
        ))}
      </Card>

      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />

      <OptimateEntityModal
        open={!!selectedStudentId}
        title={selectedStudent?.full_name || studentDetail?.full_name?.toString() || 'Учень'}
        entityId={selectedStudentId}
        loading={studentDetailLoading}
        error={studentDetailError}
        data={studentDetail}
        cache={studentDetailCache}
        onClose={() => setSelectedStudentId(null)}
        onRefresh={refreshStudentDetail}
        kind="student"
        onTeacherClick={openTeacherDetail}
      />

      <OptimateEntityModal
        open={!!selectedTeacherId}
        title={teacherTitle || 'Викладач'}
        entityId={selectedTeacherId}
        loading={teacherDetailLoading}
        error={teacherDetailError}
        data={teacherDetail}
        cache={teacherDetailCache}
        onClose={() => setSelectedTeacherId(null)}
        onRefresh={refreshTeacherDetail}
        kind="teacher"
        overlayClassName={selectedStudentId ? 'optimate-modal-overlay--above-cal' : undefined}
      />
    </>
  )
}
