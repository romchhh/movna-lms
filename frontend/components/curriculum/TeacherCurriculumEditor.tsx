'use client'

import { AppModalHeader } from '@/components/shared/AppModalHeader'
import { AddButtonLabel } from '@/components/shared/AddButtonLabel'
import {
  LESSON_TYPE_OPTIONS,
  newEditorLesson,
  newEditorModule,
  programToWrite,
  type EditorLesson,
  type EditorModule,
} from '@/lib/teacher-curriculum-api'
import { useState } from 'react'

interface TeacherCurriculumEditorProps {
  initialTitle: string
  initialIsPublic: boolean
  initialModules: EditorModule[]
  saving?: boolean
  error?: string
  onCancel: () => void
  onSave: (payload: ReturnType<typeof programToWrite>) => void
}

export function TeacherCurriculumEditor({
  initialTitle,
  initialIsPublic,
  initialModules,
  saving,
  error,
  onCancel,
  onSave,
}: TeacherCurriculumEditorProps) {
  const [title, setTitle] = useState(initialTitle)
  const [isPublic, setIsPublic] = useState(initialIsPublic)
  const [modules, setModules] = useState<EditorModule[]>(initialModules)
  const [openModules, setOpenModules] = useState<Set<string>>(
    () => new Set(initialModules.map(m => m._key)),
  )

  function toggleModule(key: string) {
    setOpenModules(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function updateModule(key: string, patch: Partial<EditorModule>) {
    setModules(prev => prev.map(m => (m._key === key ? { ...m, ...patch } : m)))
  }

  function removeModule(key: string) {
    setModules(prev => prev.filter(m => m._key !== key))
  }

  function addModule() {
    const mod = newEditorModule()
    setModules(prev => [...prev, mod])
    setOpenModules(prev => new Set(prev).add(mod._key))
  }

  function addLesson(moduleKey: string) {
    setModules(prev =>
      prev.map(m =>
        m._key === moduleKey
          ? { ...m, lessons: [...m.lessons, newEditorLesson()] }
          : m,
      ),
    )
  }

  function updateLesson(
    moduleKey: string,
    lessonKey: string,
    patch: Partial<EditorLesson>,
  ) {
    setModules(prev =>
      prev.map(m =>
        m._key === moduleKey
          ? {
              ...m,
              lessons: m.lessons.map(l =>
                l._key === lessonKey ? { ...l, ...patch } : l,
              ),
            }
          : m,
      ),
    )
  }

  function removeLesson(moduleKey: string, lessonKey: string) {
    setModules(prev =>
      prev.map(m =>
        m._key === moduleKey
          ? { ...m, lessons: m.lessons.filter(l => l._key !== lessonKey) }
          : m,
      ),
    )
  }

  function handleSave() {
    if (!title.trim()) return
    onSave(programToWrite(title, isPublic, modules))
  }

  return (
    <div className="curr-editor">
      <AppModalHeader
        title={initialTitle ? 'Редагування програми' : 'Нова навчальна програма'}
        subtitle="Додайте модулі та уроки. Збережіть, коли будете готові."
        onClose={onCancel}
        compact
      />

      <div className="curr-editor-body">
        {error && <div className="alert">{error}</div>}

        <label className="curr-editor-field">
          <span>Назва програми</span>
          <input
            className="input"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Наприклад, Business English B1"
            autoFocus
          />
        </label>

        <label className="curr-editor-visibility">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={e => setIsPublic(e.target.checked)}
          />
          <span className="curr-editor-visibility-text">
            <strong>Зробити видимою для всіх</strong>
            <small>Інші викладачі зможуть переглядати програму та бачитимуть ваше авторство</small>
          </span>
        </label>

        <div className="curr-editor-section-head">
          <h3>Модулі та уроки</h3>
          <button type="button" className="btn btn-sm btn-secondary" onClick={addModule}>
            <AddButtonLabel>Модуль</AddButtonLabel>
          </button>
        </div>

        <div className="curr-editor-modules">
          {modules.map((module, modIdx) => {
            const open = openModules.has(module._key)
            return (
              <section
                key={module._key}
                className={`curr-editor-module${open ? ' curr-editor-module--open' : ''}`}
              >
                <div className="curr-editor-module-head">
                  <button
                    type="button"
                    className="curr-editor-module-toggle"
                    onClick={() => toggleModule(module._key)}
                    aria-expanded={open}
                  >
                    <span className="curr-module-index">{modIdx + 1}</span>
                    <span>{open ? '▾' : '▸'}</span>
                  </button>
                  <input
                    className="input curr-editor-module-title"
                    value={module.title}
                    onChange={e => updateModule(module._key, { title: e.target.value })}
                    placeholder="Назва модуля"
                  />
                  {modules.length > 1 && (
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary curr-editor-remove"
                      onClick={() => removeModule(module._key)}
                    >
                      Видалити
                    </button>
                  )}
                </div>

                {open && (
                  <div className="curr-editor-lessons">
                    {module.lessons.map((lesson, lesIdx) => (
                      <div key={lesson._key} className="curr-editor-lesson">
                        <div className="curr-editor-lesson-top">
                          <span className="curr-editor-lesson-label">Урок {lesIdx + 1}</span>
                          {module.lessons.length > 1 && (
                            <button
                              type="button"
                              className="curr-editor-lesson-remove"
                              onClick={() => removeLesson(module._key, lesson._key)}
                            >
                              Прибрати
                            </button>
                          )}
                        </div>
                        <div className="curr-editor-lesson-grid">
                          <label className="curr-editor-field curr-editor-field--compact">
                            <span>№</span>
                            <input
                              className="input"
                              type="number"
                              min={1}
                              value={lesson.number ?? ''}
                              onChange={e =>
                                updateLesson(module._key, lesson._key, {
                                  number: e.target.value ? Number(e.target.value) : null,
                                })
                              }
                              placeholder="—"
                            />
                          </label>
                          <label className="curr-editor-field curr-editor-field--compact">
                            <span>Тип</span>
                            <select
                              className="input"
                              value={lesson.lesson_type}
                              onChange={e =>
                                updateLesson(module._key, lesson._key, {
                                  lesson_type: e.target.value,
                                })
                              }
                            >
                              <option value="">—</option>
                              {LESSON_TYPE_OPTIONS.map(t => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </select>
                          </label>
                          <label className="curr-editor-field curr-editor-field--wide">
                            <span>Тема</span>
                            <input
                              className="input"
                              value={lesson.topic}
                              onChange={e =>
                                updateLesson(module._key, lesson._key, { topic: e.target.value })
                              }
                              placeholder="Тема уроку"
                            />
                          </label>
                          <label className="curr-editor-field curr-editor-field--full">
                            <span>Активності учня</span>
                            <textarea
                              className="input curr-editor-textarea"
                              rows={2}
                              value={lesson.student_activities}
                              onChange={e =>
                                updateLesson(module._key, lesson._key, {
                                  student_activities: e.target.value,
                                })
                              }
                              placeholder="Що робить учень на уроці"
                            />
                          </label>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary curr-editor-add-lesson"
                      onClick={() => addLesson(module._key)}
                    >
                      <AddButtonLabel>Урок</AddButtonLabel>
                    </button>
                  </div>
                )}
              </section>
            )
          })}
        </div>
      </div>

      <footer className="curr-editor-footer">
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving}>
          Скасувати
        </button>
        <button
          type="button"
          className="btn btn-teal"
          onClick={handleSave}
          disabled={saving || !title.trim()}
        >
          {saving ? 'Збереження…' : 'Зберегти програму'}
        </button>
      </footer>
    </div>
  )
}
