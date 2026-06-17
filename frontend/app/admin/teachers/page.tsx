'use client'

import { AdminOptimateSyncBar } from '@/components/admin/AdminOptimateSyncBar'
import { OptimateEntityModal } from '@/components/admin/OptimateEntityModal'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PageHeader, Card, Empty, Pagination } from '@/components/shared/UI'
import {
  TeacherListItem,
  adminOptimateApi,
  stripHtml,
} from '@/lib/admin-optimate-api'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { CacheMeta } from '@/lib/optimate-api'
import type { TeacherLessonStats } from '@/lib/teacher-optimate-api'
import { useCallback, useEffect, useState } from 'react'

const PAGE_SIZE = 50

export default function AdminTeachers() {
  const [teachers, setTeachers] = useState<TeacherListItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [cache, setCache] = useState<CacheMeta | null>(null)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null)
  const [detailCache, setDetailCache] = useState<CacheMeta | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [lessonStats, setLessonStats] = useState<TeacherLessonStats | null>(null)
  const [lessonStatsLoading, setLessonStatsLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await adminOptimateApi.teachers(page, PAGE_SIZE, debouncedSearch)
      setTeachers(res.data)
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

  async function openDetail(id: string) {
    setSelectedId(id)
    setDetail(null)
    setLessonStats(null)
    setDetailError('')
    setDetailLoading(true)
    setLessonStatsLoading(true)
    try {
      const [detailRes, statsRes] = await Promise.all([
        adminOptimateApi.teacherDetail(id),
        adminOptimateApi.teacherLessonStats(id),
      ])
      setDetail(detailRes.data)
      setDetailCache(detailRes.cache)
      setLessonStats(statsRes)
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : 'Помилка')
    } finally {
      setDetailLoading(false)
      setLessonStatsLoading(false)
    }
  }

  async function refreshDetail() {
    if (!selectedId) return
    setDetailLoading(true)
    setLessonStatsLoading(true)
    setDetailError('')
    try {
      const [detailRes, statsRes] = await Promise.all([
        adminOptimateApi.teacherDetail(selectedId, true),
        adminOptimateApi.teacherLessonStats(selectedId, 365, 90, true),
      ])
      setDetail(detailRes.data)
      setDetailCache(detailRes.cache)
      setLessonStats(statsRes)
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : 'Помилка')
    } finally {
      setDetailLoading(false)
      setLessonStatsLoading(false)
    }
  }

  const selectedTeacher = teachers.find(t => t.id === selectedId)
  const totalStudents = teachers.reduce((sum, t) => sum + (t.students_count ?? 0), 0)

  return (
    <>
      <PageHeader
        title="Викладачі"
        sub={loading ? 'Завантаження з Optimate...' : `${total} в Optimate · ~${totalStudents} учнів`}
      >
        <AdminOptimateSyncBar cache={cache} onRefreshed={load} />
      </PageHeader>

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

      <div className="admin-teacher-list">
        {loading && <Empty label="Завантаження..." />}
        {!loading && teachers.length === 0 && <Empty label="Викладачів не знайдено" />}

        {teachers.map(t => (
          <Card key={t.id}>
            <button type="button" className="admin-teacher-row" onClick={() => openDetail(t.id)}>
              <div className="admin-teacher-avatar">
                {t.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span className="admin-table-title">{t.full_name}</span>
                  <StatusBadge label={t.status_label} status={t.status} />
                </div>
                <div className="admin-table-sub">{t.email || t.phone || `ID ${t.id}`}</div>
                {t.description && (
                  <div className="admin-table-sub">{stripHtml(t.description).slice(0, 120)}</div>
                )}
              </div>
              <div className="admin-teacher-stats">
                <div>
                  <div className="admin-teacher-stat-value">{t.product_count}</div>
                  <div className="admin-teacher-stat-label">Продукти</div>
                </div>
                <div>
                  <div className="admin-teacher-stat-value">{t.students_count ?? '—'}</div>
                  <div className="admin-teacher-stat-label">Учні</div>
                </div>
                <div>
                  <div className="admin-teacher-stat-value" style={{ color: (t.unmarked_lesson_count ?? 0) > 0 ? 'var(--rd)' : 'var(--td)' }}>
                    {t.unmarked_lesson_count ?? 0}
                  </div>
                  <div className="admin-teacher-stat-label">Непроверено</div>
                </div>
              </div>
            </button>
          </Card>
        ))}
      </div>

      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />

      <OptimateEntityModal
        open={!!selectedId}
        title={selectedTeacher?.full_name || detail?.full_name?.toString() || 'Викладач'}
        entityId={selectedId}
        loading={detailLoading}
        error={detailError}
        data={detail}
        cache={detailCache}
        onClose={() => setSelectedId(null)}
        onRefresh={refreshDetail}
        kind="teacher"
        lessonStats={lessonStats}
        lessonStatsLoading={lessonStatsLoading}
      />
    </>
  )
}
