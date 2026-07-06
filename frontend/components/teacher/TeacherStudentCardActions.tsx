'use client'

import { AssignCurriculumWizard } from '@/components/curriculum/TeacherStudentCurriculumPanel'
import { TeacherStudentLinkModal } from '@/components/teacher/TeacherStudentLinksPanel'
import { teacherStudentCurriculumApi } from '@/lib/student-curriculum-api'
import type { StudentLinkType } from '@/lib/teacher-student-links-api'
import { teacherStudentLinksApi } from '@/lib/teacher-student-links-api'
import { useCallback, useEffect, useState } from 'react'

interface TeacherStudentCardActionsProps {
  studentId: string
  studentName: string
  compact?: boolean
  /** Показувати індикатор «налаштовано» (1 запит на картку — лише для дашборду) */
  showStatus?: boolean
}

type Action = 'lesson' | 'miro' | 'program' | 'link' | null

export function TeacherStudentCardActions({
  studentId,
  studentName,
  compact = false,
  showStatus = false,
}: TeacherStudentCardActionsProps) {
  const [action, setAction] = useState<Action>(null)
  const [linkModalType, setLinkModalType] = useState<StudentLinkType>('lesson')
  const [hasLesson, setHasLesson] = useState(false)
  const [hasMiro, setHasMiro] = useState(false)
  const [hasProgram, setHasProgram] = useState(false)
  const [customCount, setCustomCount] = useState(0)

  const loadStatus = useCallback(async () => {
    if (!showStatus) return
    try {
      const [links, curriculum] = await Promise.all([
        teacherStudentLinksApi.get(studentId),
        teacherStudentCurriculumApi.getStudent(studentId).catch(() => null),
      ])
      setHasLesson(Boolean(links.lesson_link?.url))
      setHasMiro(Boolean(links.miro_link?.url))
      setCustomCount(links.custom_links.length)
      setHasProgram(Boolean(curriculum?.active))
    } catch {
      setHasLesson(false)
      setHasMiro(false)
      setHasProgram(false)
      setCustomCount(0)
    }
  }, [studentId, showStatus])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  function stop(e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
  }

  function openLink(type: StudentLinkType) {
    setLinkModalType(type)
    setAction('link')
  }

  function closeModal() {
    setAction(null)
    loadStatus()
  }

  return (
    <>
      <div
        className={`teacher-student-actions${compact ? ' teacher-student-actions--compact' : ''}`}
        onClick={stop}
        onKeyDown={e => e.stopPropagation()}
        role="group"
        aria-label={`Дії для ${studentName}`}
      >
        <button
          type="button"
          className={`teacher-student-action-btn teacher-student-action-btn--lesson${hasLesson ? ' is-set' : ''}`}
          title="Посилання на урок (Zoom / Google Meet)"
          onClick={e => { stop(e); openLink('lesson') }}
        >
          <span className="teacher-student-action-icon" aria-hidden>🎥</span>
          <span>Урок</span>
        </button>
        <button
          type="button"
          className={`teacher-student-action-btn teacher-student-action-btn--program${hasProgram ? ' is-set' : ''}`}
          title="Призначити навчальну програму"
          onClick={e => { stop(e); setAction('program') }}
        >
          <span className="teacher-student-action-icon" aria-hidden>📚</span>
          <span>Програма</span>
        </button>
        <button
          type="button"
          className={`teacher-student-action-btn teacher-student-action-btn--miro${hasMiro ? ' is-set' : ''}`}
          title="Посилання на дошку Miro"
          onClick={e => { stop(e); openLink('miro') }}
        >
          <span className="teacher-student-action-icon" aria-hidden>🧩</span>
          <span>Miro</span>
        </button>
        <button
          type="button"
          className={`teacher-student-action-btn teacher-student-action-btn--material${customCount > 0 ? ' is-set' : ''}`}
          title="Додати довільне посилання (тест, YouTube тощо)"
          onClick={e => { stop(e); openLink('custom') }}
        >
          <span className="teacher-student-action-icon" aria-hidden>🔗</span>
          <span>{customCount > 0 ? `+${customCount}` : 'Матеріал'}</span>
        </button>
      </div>

      {action === 'link' && (
        <TeacherStudentLinkModal
          studentOptimateId={studentId}
          studentName={studentName}
          initialType={linkModalType}
          onClose={closeModal}
          onSaved={loadStatus}
        />
      )}

      {action === 'program' && (
        <AssignCurriculumWizard
          studentOptimateId={studentId}
          studentName={studentName}
          replace={hasProgram}
          onClose={() => setAction(null)}
          onSaved={() => {
            setAction(null)
            loadStatus()
          }}
        />
      )}
    </>
  )
}
