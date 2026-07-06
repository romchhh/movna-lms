'use client'

import { OptimateEntityModal } from '@/components/admin/OptimateEntityModal'
import {
  TeacherStudentSettingsButton,
  TeacherStudentSettingsPanels,
} from '@/components/teacher/TeacherStudentSettingsMenu'
import { studentDisplayName } from '@/lib/person-display-name'
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
  const [settingsOpen, setSettingsOpen] = useState(false)

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
      setSettingsOpen(false)
      return
    }
    setSettingsOpen(false)
    load(studentId)
  }, [studentId, load])

  const displayName = studentDisplayName(detail, title || 'Учень')

  return (
    <OptimateEntityModal
      open={!!studentId}
      title={displayName}
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
      profileActions={
        studentId ? (
          <TeacherStudentSettingsButton
            open={settingsOpen}
            onToggle={() => setSettingsOpen(open => !open)}
          />
        ) : null
      }
      profileAddon={
        settingsOpen && studentId ? (
          <TeacherStudentSettingsPanels
            studentOptimateId={studentId}
            studentName={displayName}
          />
        ) : null
      }
    />
  )
}
