'use client'

import { OptimateEntityModal } from '@/components/admin/OptimateEntityModal'
import { TeacherStudentCurriculumPanel } from '@/components/curriculum/TeacherStudentCurriculumPanel'
import { teacherOptimateApi } from '@/lib/teacher-optimate-api'
import type { CacheMeta } from '@/lib/optimate-api'
import { useCallback, useEffect, useState } from 'react'

interface TeacherStudentDetailModalProps {
  studentId: string | null
  title?: string
  onClose: () => void
  overlayClassName?: string
}

export function TeacherStudentDetailModal({
  studentId,
  title,
  onClose,
  overlayClassName,
}: TeacherStudentDetailModalProps) {
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null)
  const [cache, setCache] = useState<CacheMeta | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async (id: string, refresh = false) => {
    setLoading(true)
    setError('')
    try {
      const res = await teacherOptimateApi.studentDetail(id, refresh)
      setDetail(res.data)
      setCache(res.cache)
    } catch (err) {
      setDetail(null)
      setError(err instanceof Error ? err.message : 'Помилка')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!studentId) {
      setDetail(null)
      setCache(null)
      setError('')
      return
    }
    load(studentId)
  }, [studentId, load])

  const modalTitle = title
    || (detail?.full_name != null ? String(detail.full_name) : 'Учень')

  const studentName = detail?.full_name != null ? String(detail.full_name) : modalTitle

  return (
    <OptimateEntityModal
      open={!!studentId}
      title={modalTitle}
      entityId={studentId}
      loading={loading}
      error={error}
      data={detail}
      cache={cache}
      onClose={onClose}
      onRefresh={() => studentId && load(studentId, true)}
      kind="student"
      audience="teacher"
      overlayClassName={overlayClassName}
      extraSections={
        studentId ? (
          <TeacherStudentCurriculumPanel
            studentOptimateId={studentId}
            studentName={studentName}
          />
        ) : null
      }
    />
  )
}
