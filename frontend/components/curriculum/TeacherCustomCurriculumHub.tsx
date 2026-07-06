'use client'

import { ConfirmDialog } from '@/components/lesson-requests/ConfirmDialog'
import { CustomCurriculumDetail } from '@/components/curriculum/CustomCurriculumDetail'
import { TeacherCurriculumEditor } from '@/components/curriculum/TeacherCurriculumEditor'
import { AddButtonLabel } from '@/components/shared/AddButtonLabel'
import { Empty, PageHeader } from '@/components/shared/UI'
import {
  emptyProgramToEditor,
  programToEditor,
  teacherCurriculumApi,
  type TeacherCurriculumProgram,
  type TeacherCurriculumSummary,
  type TeacherCurriculumWrite,
} from '@/lib/teacher-curriculum-api'
import { useCallback, useEffect, useMemo, useState } from 'react'

type ViewMode = 'detail' | 'create' | 'edit'
type FilterTab = 'all' | 'mine' | 'shared'

interface TeacherCustomCurriculumHubProps {
  openRequest?: {
    id: number
    mode: 'edit' | 'detail'
    program?: TeacherCurriculumProgram
  } | null
  onOpenRequestConsumed?: () => void
}

function formatUpdated(iso: string): string {
  return new Date(iso).toLocaleString('uk-UA', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function TeacherCustomCurriculumHub({
  openRequest = null,
  onOpenRequestConsumed,
}: TeacherCustomCurriculumHubProps) {
  const [programs, setPrograms] = useState<TeacherCurriculumSummary[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detail, setDetail] = useState<TeacherCurriculumProgram | null>(null)
  const [mode, setMode] = useState<ViewMode>('detail')
  const [filter, setFilter] = useState<FilterTab>('all')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null)
  const [forking, setForking] = useState(false)

  const [editorState, setEditorState] = useState(() => emptyProgramToEditor())

  const loadList = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await teacherCurriculumApi.list()
      setPrograms(res.programs)
      setSelectedId(prev => {
        if (prev && res.programs.some(p => p.id === prev)) return prev
        return res.programs[0]?.id ?? null
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка завантаження')
      setPrograms([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadList()
  }, [loadList])

  useEffect(() => {
    if (!openRequest) return
    setSelectedId(openRequest.id)
    setMode(openRequest.mode)
    if (openRequest.program) {
      setDetail(openRequest.program)
      if (openRequest.mode === 'edit') {
        setEditorState(programToEditor(openRequest.program))
      }
    }
    onOpenRequestConsumed?.()
  }, [openRequest, onOpenRequestConsumed])

  const loadDetail = useCallback(async (id: number) => {
    setDetailLoading(true)
    setError('')
    try {
      const program = await teacherCurriculumApi.get(id)
      setDetail(program)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка завантаження')
      setDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }, [])

  useEffect(() => {
    if ((mode !== 'detail' && mode !== 'edit') || !selectedId) {
      if (!selectedId) setDetail(null)
      return
    }
    if (mode === 'edit' && detail?.id === selectedId) return
    loadDetail(selectedId)
  }, [selectedId, mode, loadDetail, detail?.id])

  useEffect(() => {
    if (mode === 'edit' && selectedId && detail?.id === selectedId) {
      setEditorState(programToEditor(detail))
    }
  }, [mode, selectedId, detail])

  const filtered = useMemo(() => {
    let list = programs
    if (filter === 'mine') list = list.filter(p => p.is_mine)
    if (filter === 'shared') list = list.filter(p => !p.is_mine)
    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter(
        p =>
          p.title.toLowerCase().includes(q) ||
          p.author.full_name.toLowerCase().includes(q),
      )
    }
    return list
  }, [programs, filter, query])

  function startCreate() {
    setMode('create')
    setSelectedId(null)
    setDetail(null)
    setSaveError('')
    setEditorState(emptyProgramToEditor())
  }

  function startEdit() {
    if (!detail) return
    setMode('edit')
    setSaveError('')
    setEditorState(programToEditor(detail))
  }

  function cancelEditor() {
    setMode('detail')
    setSaveError('')
    if (programs.length > 0) {
      setSelectedId(programs[0]?.id ?? null)
    }
  }

  async function handleSave(payload: TeacherCurriculumWrite) {
    setSaving(true)
    setSaveError('')
    try {
      const saved =
        mode === 'edit' && selectedId
          ? await teacherCurriculumApi.update(selectedId, payload)
          : await teacherCurriculumApi.create(payload)
      await loadList()
      setSelectedId(saved.id)
      setDetail(saved)
      setMode('detail')
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Помилка збереження')
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    setError('')
    try {
      await teacherCurriculumApi.remove(deleteTarget)
      setDeleteTarget(null)
      setMode('detail')
      setDetail(null)
      setSelectedId(null)
      await loadList()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка видалення')
    } finally {
      setDeleting(false)
    }
  }

  async function handleFork(programId: number) {
    setForking(true)
    setError('')
    try {
      const forked = await teacherCurriculumApi.forkFromProgram(programId)
      await loadList()
      setSelectedId(forked.id)
      setDetail(forked)
      setMode('edit')
      setEditorState(programToEditor(forked))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка копіювання')
    } finally {
      setForking(false)
    }
  }

  async function handleTogglePublic(next: boolean) {
    if (!detail || !detail.can_edit) return
    setSaving(true)
    setError('')
    try {
      const payload: TeacherCurriculumWrite = {
        title: detail.title,
        is_public: next,
        modules: detail.modules.map(m => ({
          title: m.title,
          lessons: m.lessons.map(l => ({
            number: l.number,
            lesson_type: l.lesson_type,
            topic: l.topic,
            student_activities: l.student_activities,
          })),
        })),
      }
      const updated = await teacherCurriculumApi.update(detail.id, payload)
      setDetail(updated)
      await loadList()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка оновлення')
    } finally {
      setSaving(false)
    }
  }

  const sub = loading
    ? 'Завантаження…'
    : `${programs.length} програм · мої, публічні та копії з Movna`

  return (
    <div className="curr-hub curr-hub--teacher">
      <PageHeader title="Власні програми" sub={sub}>
        <button type="button" className="btn btn-sm btn-teal" onClick={startCreate}>
          <AddButtonLabel>Створити програму</AddButtonLabel>
        </button>
      </PageHeader>

      {error && <div className="alert">{error}</div>}

      {loading && <Empty label="Завантаження програм…" />}

      {!loading && (
        <div className="curr-layout">
          <aside className="curr-sidebar">
            <div className="curr-custom-filters">
              {([
                ['all', 'Усі'],
                ['mine', 'Мої'],
                ['shared', 'Публічні'],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={`filter-chip-btn btn btn-sm${filter === key ? ' btn-teal' : ' btn-secondary'}`}
                  onClick={() => setFilter(key)}
                >
                  {label}
                </button>
              ))}
            </div>
            <input
              className="input curr-search"
              placeholder="Пошук програми або автора…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            <p className="curr-sidebar-label">{filtered.length} з {programs.length}</p>
            <div className="curr-program-list">
              {filtered.map(program => (
                <button
                  key={program.id}
                  type="button"
                  className={`curr-program-pick${selectedId === program.id && mode === 'detail' ? ' curr-program-pick--active' : ''}`}
                  onClick={() => {
                    setSelectedId(program.id)
                    setMode('detail')
                  }}
                >
                  <span className="curr-program-pick-title">{program.title}</span>
                  <span className="curr-program-pick-meta">
                    <span>{program.module_count} модулів</span>
                    <span>{program.lesson_count} уроків</span>
                  </span>
                  <span className="curr-program-pick-author">
                    {program.is_mine ? 'Моя' : program.author.full_name}
                    {program.is_public ? ' · публічна' : ''}
                    {program.source_movna_name ? ` · з Movna` : ''}
                  </span>
                  <span className="curr-program-pick-date">{formatUpdated(program.updated_at)}</span>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="curr-sidebar-empty">
                  {programs.length === 0
                    ? 'Ще немає програм. Створіть першу!'
                    : 'Нічого не знайдено'}
                </p>
              )}
            </div>
          </aside>

          <main className="curr-main">
            {mode === 'create' || mode === 'edit' ? (
              <TeacherCurriculumEditor
                key={mode === 'edit' ? `edit-${selectedId}` : 'create'}
                initialTitle={editorState.title}
                initialIsPublic={editorState.isPublic}
                initialModules={editorState.modules}
                saving={saving}
                error={saveError}
                onCancel={cancelEditor}
                onSave={handleSave}
              />
            ) : detailLoading ? (
              <Empty label="Завантаження програми…" />
            ) : detail ? (
              <CustomCurriculumDetail
                program={detail}
                onEdit={detail.can_edit ? startEdit : undefined}
                onDelete={detail.can_edit ? () => setDeleteTarget(detail.id) : undefined}
                onFork={!detail.is_mine ? () => void handleFork(detail.id) : undefined}
                onTogglePublic={detail.can_edit ? handleTogglePublic : undefined}
                forking={forking}
                deleting={deleting}
              />
            ) : (
              <div className="curr-custom-placeholder">
                <Empty
                  label={
                    programs.length === 0
                      ? 'Створіть свою першу навчальну програму'
                      : 'Оберіть програму зі списку'
                  }
                />
                {programs.length === 0 && (
                  <button type="button" className="btn btn-teal" onClick={startCreate}>
                    <AddButtonLabel>Створити програму</AddButtonLabel>
                  </button>
                )}
              </div>
            )}
          </main>
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget != null}
        title="Видалити програму?"
        message="Програму, модулі та уроки буде видалено безповоротно."
        confirmLabel="Видалити"
        cancelLabel="Скасувати"
        danger
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
