'use client'

import { Badge } from '@/components/shared/UI'
import {
  lessonTypeAccentClass,
  lessonTypeVariant,
  type CurriculumProgram,
} from '@/lib/curriculum-api'
import { useState } from 'react'

interface CurriculumProgramDetailProps {
  program: CurriculumProgram
  onCustomize?: () => void
  customizing?: boolean
}

export function CurriculumProgramDetail({ program, onCustomize, customizing }: CurriculumProgramDetailProps) {
  const [openModules, setOpenModules] = useState<Set<string>>(
    () => new Set(program.modules.slice(0, 1).map(m => m.name)),
  )

  function toggleModule(name: string) {
    setOpenModules(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  return (
    <div className="curr-program">
      <header className="curr-program-hero">
        <div>
          <h2 className="curr-program-title">{program.name}</h2>
          <p className="curr-program-meta">
            Оригінал з Google Sheets · редагування створює вашу копію на сервері LMS
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
          {onCustomize && (
            <button
              type="button"
              className="btn btn-sm btn-teal"
              onClick={onCustomize}
              disabled={customizing}
            >
              {customizing ? 'Створення копії…' : 'Редагувати копію'}
            </button>
          )}
        </div>
      </header>

      <div className="curr-modules">
        {program.modules.map((module, moduleIdx) => {
          const open = openModules.has(module.name)
          return (
            <section key={module.name} className={`curr-module${open ? ' curr-module--open' : ''}`}>
              <button
                type="button"
                className="curr-module-toggle"
                onClick={() => toggleModule(module.name)}
                aria-expanded={open}
              >
                <span className="curr-module-index">{moduleIdx + 1}</span>
                <span className="curr-module-name">{module.name}</span>
                <Badge variant="gray">{module.lessons.length} ур.</Badge>
                <span className="curr-module-chevron" aria-hidden>{open ? '▾' : '▸'}</span>
              </button>

              {open && (
                <div className="curr-module-body">
                  {module.lessons.map((lesson, idx) => (
                    <article
                      key={`${module.name}-${lesson.number ?? idx}-${lesson.topic}`}
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
                      <h4 className="curr-lesson-topic">{lesson.topic}</h4>
                      {lesson.student_activities && (
                        <p className="curr-lesson-activities">{lesson.student_activities}</p>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}
