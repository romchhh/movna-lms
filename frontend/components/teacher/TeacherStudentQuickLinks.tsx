'use client'

import { teacherStudentLinksApi } from '@/lib/teacher-student-links-api'
import { useCallback, useEffect, useState } from 'react'

interface TeacherStudentQuickLinksProps {
  studentOptimateId: string
  chatUrl?: string | null
  onEditLesson: () => void
  onEditMiro: () => void
}

export function TeacherStudentQuickLinks({
  studentOptimateId,
  chatUrl,
  onEditLesson,
  onEditMiro,
}: TeacherStudentQuickLinksProps) {
  const [lessonUrl, setLessonUrl] = useState<string | null>(null)
  const [miroUrl, setMiroUrl] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await teacherStudentLinksApi.get(studentOptimateId)
      setLessonUrl(data.lesson_link?.url ?? null)
      setMiroUrl(data.miro_link?.url ?? null)
    } catch {
      setLessonUrl(null)
      setMiroUrl(null)
    }
  }, [studentOptimateId])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    function onLinksUpdated() {
      load()
    }
    window.addEventListener('teacher-student-links-updated', onLinksUpdated)
    return () => window.removeEventListener('teacher-student-links-updated', onLinksUpdated)
  }, [load])

  return (
    <div className="teacher-student-quick-links" role="group" aria-label="Швидкі посилання">
      {lessonUrl ? (
        <a
          href={lessonUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="teacher-student-quick-link teacher-student-quick-link--zoom"
        >
          <span className="teacher-student-quick-link-icon" aria-hidden>🎥</span>
          <span className="teacher-student-quick-link-text">
            <strong>Zoom / Meet</strong>
            <span>Відкрити урок</span>
          </span>
        </a>
      ) : (
        <button type="button" className="teacher-student-quick-link teacher-student-quick-link--empty" onClick={onEditLesson}>
          <span className="teacher-student-quick-link-icon" aria-hidden>🎥</span>
          <span className="teacher-student-quick-link-text">
            <strong>Zoom / Meet</strong>
            <span>Додати посилання</span>
          </span>
        </button>
      )}

      {miroUrl ? (
        <a
          href={miroUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="teacher-student-quick-link teacher-student-quick-link--miro"
        >
          <span className="teacher-student-quick-link-icon" aria-hidden>🧩</span>
          <span className="teacher-student-quick-link-text">
            <strong>Miro</strong>
            <span>Відкрити дошку</span>
          </span>
        </a>
      ) : (
        <button type="button" className="teacher-student-quick-link teacher-student-quick-link--empty" onClick={onEditMiro}>
          <span className="teacher-student-quick-link-icon" aria-hidden>🧩</span>
          <span className="teacher-student-quick-link-text">
            <strong>Miro</strong>
            <span>Додати дошку</span>
          </span>
        </button>
      )}

      {chatUrl && (
        <a
          href={chatUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="teacher-student-quick-link teacher-student-quick-link--chat"
        >
          <span className="teacher-student-quick-link-icon" aria-hidden>💬</span>
          <span className="teacher-student-quick-link-text">
            <strong>Telegram</strong>
            <span>Чат з учнем</span>
          </span>
        </a>
      )}
    </div>
  )
}
