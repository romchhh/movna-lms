'use client'

import { Badge } from '@/components/shared/UI'
import { studentCurriculumApi, teacherStudentCurriculumApi, type EventTopic } from '@/lib/student-curriculum-api'
import { useEffect, useState } from 'react'

interface EventCurriculumTopicSectionProps {
  eventId: string
  audience: 'teacher' | 'student'
  studentOptimateId?: string
}

export function EventCurriculumTopicSection({
  eventId,
  audience,
  studentOptimateId,
}: EventCurriculumTopicSectionProps) {
  const [topic, setTopic] = useState<EventTopic | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const data = audience === 'teacher' && studentOptimateId
          ? await teacherStudentCurriculumApi.eventTopic(eventId, studentOptimateId)
          : await studentCurriculumApi.eventTopic(eventId)
        const hasTopic = Boolean(data.display_topic || data.topic)
        if (!cancelled) setTopic(hasTopic || data.program_title ? data : null)
      } catch {
        if (!cancelled) setTopic(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [eventId, audience, studentOptimateId])

  if (loading) return <p className="hw-event-muted">Тема уроку…</p>
  if (!topic) return null

  const title = topic.display_topic || topic.topic

  return (
    <div className="stc-event-topic">
      {topic.program_title && (
        <div className="stc-event-topic-program">{topic.program_title}</div>
      )}
      {title ? (
        <>
          <div className="stc-event-topic-head">
            <h4>Тема уроку</h4>
            {topic.lesson_type && <Badge variant="purple">{topic.lesson_type}</Badge>}
          </div>
          <p className="stc-event-topic-title">{title}</p>
          {topic.module_title && <p className="stc-event-topic-module">{topic.module_title}</p>}
        </>
      ) : (
        <p className="stc-event-topic-module">Тему для цього уроку ще не призначено</p>
      )}
    </div>
  )
}
