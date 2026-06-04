'use client'

import { TeacherStudentDetailModal } from '@/components/teacher/TeacherStudentDetailModal'
import { Badge, Card, Empty, PageHeader } from '@/components/shared/UI'
import { TeacherGroup, teacherOptimateApi } from '@/lib/teacher-optimate-api'
import { useCallback, useEffect, useMemo, useState } from 'react'

function studentInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function statusBadgeVariant(status: number): 'teal' | 'gray' | 'amber' | 'purple' {
  if (status === 1) return 'teal'
  if (status === 2) return 'gray'
  if (status === 3) return 'purple'
  if (status === 4) return 'amber'
  return 'gray'
}

function groupStatusBadgeVariant(status: number): 'teal' | 'gray' | 'amber' {
  if (status === 1) return 'teal'
  if (status === 2) return 'gray'
  return 'amber'
}

export default function TeacherGroups() {
  const [groups, setGroups] = useState<TeacherGroup[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedTitle, setSelectedTitle] = useState('')

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

  function openStudent(id: string, name: string) {
    setSelectedId(id)
    setSelectedTitle(name)
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
              <Badge variant={groupStatusBadgeVariant(group.status)}>{group.status_label}</Badge>
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
            <span style={{ textAlign: 'center' }}>Статус</span>
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
                onClick={() => openStudent(student.id, student.full_name)}
              >
                <div className="teacher-students-main">
                  <div className="admin-teacher-avatar">{studentInitials(student.full_name)}</div>
                  <div className="admin-table-title">{student.full_name}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <Badge variant={statusBadgeVariant(student.status)}>{student.status_label}</Badge>
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

      <TeacherStudentDetailModal
        studentId={selectedId}
        title={selectedTitle}
        onClose={() => {
          setSelectedId(null)
          setSelectedTitle('')
        }}
      />
    </>
  )
}
