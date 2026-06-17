'use client'

import { Badge } from '@/components/shared/UI'
import {
  lessonTypeAccentClass,
  lessonTypeVariant,
} from '@/lib/curriculum-api'
import type { TeacherCurriculumProgram } from '@/lib/teacher-curriculum-api'
import { useState } from 'react'

interface CustomCurriculumDetailProps {
  program: TeacherCurriculumProgram
  onEdit?: () => void
  onDelete?: () => void
  deleting?: boolean
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('uk-UA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function CustomCurriculumDetail({
  program,
  onEdit,
  onDelete,
  deleting,
}: CustomCurriculumDetailProps) {
  const [openModules, setOpenModules] = useState<Set<number>>(
    () => new Set(program.modules.slice(0, 1).map(m => m.id ?? 0)),
  )

  function toggleModule(id: number) {
    setOpenModules(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="curr-program">
      <header className="curr-program-hero">
        <div className="curr-program-hero-text">
          <div className="curr-custom-badges">
            {program.is_mine ? (
              <Badge variant="teal">Моя програма</Badge>
            ) : (
              <Badge variant="purple">Колега</Badge>
            )}
            {program.is_public && <Badge variant="green">Видима для всіх</Badge>}
            {!program.is_public && program.is_mine && (
              <Badge variant="gray">Лише для мене</Badge>
            )}
          </div>
          <h2 className="curr-program-title">{program.title}</h2>
          <p className="curr-program-meta">
            Автор: <strong>{program.author.full_name}</strong>
            {' · '}
            оновлено {formatDate(program.updated_at)}
          </p>
        </div>
        <div className="curr-program-hero-side">
          <div className="curr-program-stats">
            <div className="curr-stat-chip">
              <span className="curr-stat-value">{program.module_count}</span>
              <span className="curr-stat-label">модулів</span>
            </div>
            <div className="curr-stat-chip">
              <span className="curr-stat-value">{program.lesson_count}</span>
              <span className="curr-stat-label">уроків</span>
            </div>
          </div>
          {program.can_edit && (
            <div className="curr-custom-actions">
              {onEdit && (
                <button type="button" className="btn btn-sm btn-teal" onClick={onEdit}>
                  Редагувати
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={onDelete}
                  disabled={deleting}
                >
                  {deleting ? 'Видалення…' : 'Видалити'}
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {program.modules.length === 0 ? (
        <p className="curr-custom-empty">Модулі ще не додано</p>
      ) : (
        <div className="curr-modules">
          {program.modules.map((module, moduleIdx) => {
            const modId = module.id ?? moduleIdx
            const open = openModules.has(modId)
            return (
              <section key={modId} className={`curr-module${open ? ' curr-module--open' : ''}`}>
                <button
                  type="button"
                  className="curr-module-toggle"
                  onClick={() => toggleModule(modId)}
                  aria-expanded={open}
                >
                  <span className="curr-module-index">{moduleIdx + 1}</span>
                  <span className="curr-module-name">{module.title}</span>
                  <Badge variant="gray">{module.lessons.length} ур.</Badge>
                  <span className="curr-module-chevron" aria-hidden>{open ? '▾' : '▸'}</span>
                </button>

                {open && (
                  <div className="curr-module-body">
                    {module.lessons.length === 0 ? (
                      <p className="curr-custom-empty curr-custom-empty--inline">Уроків немає</p>
                    ) : (
                      module.lessons.map((lesson, idx) => (
                        <article
                          key={lesson.id ?? idx}
                          className={`curr-lesson-card ${lesson.lesson_type ? lessonTypeAccentClass(lesson.lesson_type) : ''}`}
                        >
                          <div className="curr-lesson-card-top">
                            <span className="curr-lesson-num">
                              {lesson.number != null ? lesson.number : '—'}
                            </span>
                            {lesson.lesson_type ? (
                              <Badge variant={lessonTypeVariant(lesson.lesson_type)}>
                                {lesson.lesson_type}
                              </Badge>
                            ) : null}
                          </div>
                          <h4 className="curr-lesson-topic">{lesson.topic || 'Без теми'}</h4>
                          {lesson.student_activities && (
                            <p className="curr-lesson-activities">{lesson.student_activities}</p>
                          )}
                        </article>
                      ))
                    )}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
