'use client'

import { StatusBadge } from '@/components/shared/StatusBadge'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { Card, Empty, PageHeader } from '@/components/shared/UI'
import { useLmsProfiles } from '@/hooks/useLmsProfiles'
import { groupStatusMeta } from '@/lib/status-ui'
import { TeacherGroup, teacherOptimateApi } from '@/lib/teacher-optimate-api'
import { teacherStudentPagePath } from '@/lib/teacher-student-routes'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

export default function TeacherGroups() {
  const router = useRouter()
  const [groups, setGroups] = useState<TeacherGroup[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await teacherOptimateApi.groups()
      setGroups(res.data)
      setTotal(res.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка завантаження')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const studentTotal = useMemo(
    () => groups.reduce((sum, group) => sum + group.students.length, 0),
    [groups],
  )

  const allStudentIds = useMemo(
    () => groups.flatMap(g => g.students.map(s => s.id)),
    [groups],
  )
  useLmsProfiles(allStudentIds)

  function openStudent(id: string) {
    router.push(teacherStudentPagePath(id))
  }

  return (
    <>
      <PageHeader
        title="Мої групи"
        sub={
          loading
            ? 'Завантаження з Optimate...'
            : `${total} ${total === 1 ? 'група' : total < 5 ? 'групи' : 'груп'} · ${studentTotal} учнів`
        }
      />

      {error && <div className="alert">{error}</div>}

      {loading && <Empty label="Завантаження..." />}

      {!loading && !error && groups.length === 0 && (
        <Empty label="Груп не знайдено" />
      )}

      {!loading && groups.map(group => (
        <Card
          key={group.id}
          title={group.name}
          action={
            <div className="teacher-group-card-action">
              {group.level_label && (
                <span className="badge badge-purple">{group.level_label}</span>
              )}
              <StatusBadge label={group.status_label} meta={groupStatusMeta(group.status)} />
              <span style={{ fontSize: 11, color: 'var(--tx2)' }}>{group.schedule_label}</span>
              {group.chat_url && (
                <a
                  href={group.chat_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 11, color: 'var(--t)' }}
                >
                  Чат
                </a>
              )}
            </div>
          }
        >
          <div className="teacher-group-students-head">
            <span>Учень</span>
            <span>Статус</span>
            <span>Контакт</span>
          </div>

          {group.students.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--tx2)', padding: '12px 0' }}>У групі немає учнів</p>
          ) : (
            group.students.map(student => (
              <button
                key={student.id}
                type="button"
                className="teacher-group-students-row teacher-group-students-row--clickable"
                onClick={() => openStudent(student.id)}
              >
                <div className="teacher-students-main">
                  <UserAvatar name={student.full_name} optimateId={student.id} size="lg" kind="student" />
                  <div className="admin-table-title">{student.full_name}</div>
                </div>
            <div style={{ textAlign: 'inherit' }}>
              <StatusBadge label={student.status_label} status={student.status} />
            </div>
                <span style={{ fontSize: 12, color: 'var(--tx2)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {student.email || student.phone || '—'}
                </span>
              </button>
            ))
          )}

          <div className="teacher-group-footer">
            <span>
              {group.student_count} / {group.max_student_count} учнів · {group.completed_lessons} проведених · {group.planned_lessons} запланованих
            </span>
            {group.attendance_percentage > 0 && (
              <span>Відвідуваність: {Math.round(group.attendance_percentage)}%</span>
            )}
          </div>
        </Card>
      ))}
    </>
  )
}
