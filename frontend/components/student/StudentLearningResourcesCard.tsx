'use client'

import { MiroEmbedModal } from '@/components/lesson/MiroEmbedModal'
import { Card, Empty } from '@/components/shared/UI'
import {
  studentLearningResourcesApi,
  type StudentTeacherResources,
} from '@/lib/student-learning-resources-api'
import { useCallback, useEffect, useState } from 'react'

function ResourceGroup({ group }: { group: StudentTeacherResources }) {
  const [miroOpen, setMiroOpen] = useState(false)
  const hasLesson = Boolean(group.lesson_url?.trim())
  const hasMiro = Boolean(group.miro_url?.trim())
  const hasCustom = group.custom_links.length > 0

  if (!hasLesson && !hasMiro && !hasCustom) return null

  return (
    <div className="student-resources-group">
      <div className="student-resources-teacher">{group.teacher_name}</div>

      <div className="student-resources-grid">
        {hasLesson && (
          <a href={group.lesson_url} target="_blank" rel="noopener noreferrer" className="student-resource-card student-resource-card--lesson">
            <span className="student-resource-icon">🎥</span>
            <span className="student-resource-title">Посилання на урок</span>
            <span className="student-resource-sub">Zoom / Google Meet</span>
          </a>
        )}

        {hasMiro && (
          <button type="button" className="student-resource-card student-resource-card--miro" onClick={() => setMiroOpen(true)}>
            <span className="student-resource-icon">🧩</span>
            <span className="student-resource-title">Дошка Miro</span>
            <span className="student-resource-sub">Відкрити інтерактивну дошку</span>
          </button>
        )}

        {group.custom_links.map(link => (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="student-resource-card student-resource-card--custom"
          >
            <span className="student-resource-icon">🔗</span>
            <span className="student-resource-title">{link.label || 'Матеріал'}</span>
            <span className="student-resource-sub">Додаткове посилання</span>
          </a>
        ))}
      </div>

      {miroOpen && hasMiro && (
        <MiroEmbedModal
          url={group.miro_url}
          title={`Miro · ${group.teacher_name}`}
          onClose={() => setMiroOpen(false)}
        />
      )}
    </div>
  )
}

interface StudentLearningResourcesCardProps {
  compact?: boolean
}

export function StudentLearningResourcesCard({ compact = false }: StudentLearningResourcesCardProps) {
  const [groups, setGroups] = useState<StudentTeacherResources[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await studentLearningResourcesApi.list()
      setGroups(data.groups)
    } catch {
      setGroups([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const visible = groups.filter(
    g => g.lesson_url || g.miro_url || g.custom_links.length > 0,
  )

  if (loading) {
    return compact
      ? <p className="stc-summary-muted">Завантаження посилань…</p>
      : <Card title="Матеріали від викладача"><Empty label="Завантаження…" /></Card>
  }

  if (visible.length === 0) {
    return compact
      ? null
      : (
        <Card title="Матеріали від викладача">
          <Empty label="Викладач ще не додав посилання на урок, Miro або матеріали" />
        </Card>
      )
  }

  const body = (
    <div className="student-resources-wrap">
      {visible.map(group => (
        <ResourceGroup key={group.teacher_optimate_id || group.teacher_name} group={group} />
      ))}
    </div>
  )

  if (compact) return body

  return <Card title="Матеріали від викладача">{body}</Card>
}
