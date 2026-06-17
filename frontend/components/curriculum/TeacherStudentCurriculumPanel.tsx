'use client'

import { AddButtonLabel } from '@/components/shared/AddButtonLabel'
import { Badge, Empty, ProgressBar } from '@/components/shared/UI'
import { curriculumApi, type CurriculumProgram } from '@/lib/curriculum-api'
import {
  teacherStudentCurriculumApi,
  slotStatusLabel,
  type EnrollmentDetail,
  type TeacherStudentCurriculum,
} from '@/lib/student-curriculum-api'
import { teacherCurriculumApi, type TeacherCurriculumProgram } from '@/lib/teacher-curriculum-api'
import { useCallback, useEffect, useMemo, useState } from 'react'

interface TeacherStudentCurriculumPanelProps {
  studentOptimateId: string
  studentName: string
}

type ProgramPick =
  | { source: 'movna'; program: CurriculumProgram }
  | { source: 'custom'; program: TeacherCurriculumProgram }

function formatEventDate(iso: string): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('uk-UA', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export function TeacherStudentCurriculumPanel({
  studentOptimateId,
  studentName,
}: TeacherStudentCurriculumPanelProps) {
  const [data, setData] = useState<TeacherStudentCurriculum | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [wizardOpen, setWizardOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData(await teacherStudentCurriculumApi.getStudent(studentOptimateId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка')
    } finally {
      setLoading(false)
    }
  }, [studentOptimateId])

  useEffect(() => {
    load()
  }, [load])

  async function onAssigned(enrollment: EnrollmentDetail) {
    setWizardOpen(false)
    setData(prev => ({
      student_optimate_id: studentOptimateId,
      student_name: studentName,
      active: enrollment,
      history: prev?.history.filter(h => h.id !== enrollment.id) ?? [],
    }))
    await load()
  }

  async function syncEvents() {
    if (!data?.active) return
    setBusy(true)
    setError('')
    try {
      const res = await teacherStudentCurriculumApi.syncEvents(data.active.id)
      setData(prev => prev ? { ...prev, active: res.enrollment } : prev)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка')
    } finally {
      setBusy(false)
    }
  }

  async function splitSlot(slotId: number) {
    setBusy(true)
    setError('')
    try {
      const enrollment = await teacherStudentCurriculumApi.splitSlot(slotId)
      setData(prev => prev ? { ...prev, active: enrollment } : prev)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка')
    } finally {
      setBusy(false)
    }
  }

  async function completeSlot(slotId: number) {
    setBusy(true)
    try {
      await teacherStudentCurriculumApi.completeSlot(slotId)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка')
    } finally {
      setBusy(false)
    }
  }

  const active = data?.active

  return (
    <section className="stc-panel">
      <div className="stc-panel-head">
        <div>
          <h3>Навчальна програма</h3>
          {active && (
            <p className="stc-panel-program-name">{active.program_title}</p>
          )}
          <p className="stc-panel-sub">Теми уроків у розкладі та прогрес учня</p>
        </div>
        <button
          type="button"
          className="btn btn-sm btn-teal"
          onClick={() => setWizardOpen(true)}
        >
          <AddButtonLabel>{active ? 'Змінити програму' : 'Призначити програму'}</AddButtonLabel>
        </button>
      </div>

      {error && <div className="alert">{error}</div>}
      {loading && <Empty label="Завантаження програми…" />}

      {!loading && !active && (
        <div className="stc-empty">
          <Empty label="Програму ще не призначено" />
        </div>
      )}

      {!loading && active && (
        <>
          <div className="stc-active-card">
            <div className="stc-active-top">
              <div>
                <div className="stc-summary-label">Програма</div>
                <div className="stc-active-title">{active.program_title}</div>
                <div className="stc-active-meta">
                  {active.curriculum_source === 'movna' ? 'Movna' : 'Власна / спільна'}
                  {' · '}
                  {active.completed_slots}/{active.total_slots} тем
                </div>
              </div>
              <Badge variant="teal">{active.progress_pct}%</Badge>
            </div>
            <ProgressBar pct={active.progress_pct} color="var(--t)" />
            <div className="stc-active-actions">
              <button type="button" className="btn btn-sm btn-secondary" onClick={syncEvents} disabled={busy}>
                Оновити розклад
              </button>
            </div>
          </div>

          <div className="stc-slots">
            {active.slots.map(slot => (
              <div key={slot.id} className={`stc-slot stc-slot--${slot.status}`}>
                <div className="stc-slot-main">
                  <span className="stc-slot-seq">{slot.sequence_index + 1}</span>
                  <div className="stc-slot-body">
                    <div className="stc-slot-topic">{slot.display_topic || slot.topic || '—'}</div>
                    <div className="stc-slot-meta">
                      {slot.module_title}
                      {slot.lesson_type ? ` · ${slot.lesson_type}` : ''}
                      {slot.event_starts_at ? ` · ${formatEventDate(slot.event_starts_at)}` : ''}
                    </div>
                  </div>
                  <Badge variant={slot.status === 'completed' ? 'green' : slot.status === 'scheduled' ? 'amber' : 'gray'}>
                    {slotStatusLabel(slot.status)}
                  </Badge>
                </div>
                <div className="stc-slot-actions">
                  {slot.split_total === 1 && slot.status !== 'completed' && (
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      disabled={busy}
                      onClick={() => splitSlot(slot.id)}
                    >
                      Розділити на 2 уроки
                    </button>
                  )}
                  {slot.status !== 'completed' && (
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      disabled={busy}
                      onClick={() => completeSlot(slot.id)}
                    >
                      Позначити пройденим
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {!loading && (data?.history.length ?? 0) > 0 && (
        <div className="stc-history">
          <h4>Історія програм</h4>
          {data!.history.map(item => (
            <div key={item.id} className="stc-history-row">
              <span>{item.program_title}</span>
              <span>{item.completed_slots}/{item.total_slots} · {item.progress_pct}%</span>
            </div>
          ))}
        </div>
      )}

      {wizardOpen && (
        <AssignCurriculumWizard
          studentOptimateId={studentOptimateId}
          studentName={studentName}
          replace={!!active}
          onClose={() => setWizardOpen(false)}
          onSaved={onAssigned}
        />
      )}
    </section>
  )
}

function AssignCurriculumWizard({
  studentOptimateId,
  studentName,
  replace,
  onClose,
  onSaved,
}: {
  studentOptimateId: string
  studentName: string
  replace: boolean
  onClose: () => void
  onSaved: (e: EnrollmentDetail) => void
}) {
  const [movnaPrograms, setMovnaPrograms] = useState<CurriculumProgram[]>([])
  const [customPrograms, setCustomPrograms] = useState<TeacherCurriculumProgram[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'movna' | 'custom'>('movna')
  const [pick, setPick] = useState<ProgramPick | null>(null)
  const [startModule, setStartModule] = useState(0)
  const [startLesson, setStartLesson] = useState(0)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const [movna, customList] = await Promise.all([
          curriculumApi.list('teacher'),
          teacherCurriculumApi.list(),
        ])
        if (cancelled) return
        setMovnaPrograms(movna.programs)
        const customDetails = await Promise.all(
          customList.programs.map(p => teacherCurriculumApi.get(p.id)),
        )
        if (!cancelled) setCustomPrograms(customDetails)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Помилка')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const modules = useMemo(() => {
    if (!pick) return []
    if (pick.source === 'movna') {
      return pick.program.modules.map((m, i) => ({
        index: i,
        title: m.name,
        lessons: m.lessons.map((l, li) => ({ index: li, label: l.topic || `Урок ${l.number ?? li + 1}` })),
      }))
    }
    return pick.program.modules.map((m, i) => ({
      index: i,
      title: m.title,
      lessons: m.lessons.map((l, li) => ({ index: li, label: l.topic || `Урок ${l.number ?? li + 1}` })),
    }))
  }, [pick])

  async function save() {
    if (!pick) return
    setSaving(true)
    setError('')
    try {
      const payload = {
        student_optimate_id: studentOptimateId,
        student_name: studentName,
        curriculum_source: pick.source as 'movna' | 'custom',
        movna_program_slug: pick.source === 'movna' ? pick.program.slug : undefined,
        teacher_curriculum_id: pick.source === 'custom' ? pick.program.id : undefined,
        start_module_index: startModule,
        start_lesson_index: startLesson,
        sync_events: true,
      }
      const enrollment = replace
        ? await teacherStudentCurriculumApi.replace(payload)
        : await teacherStudentCurriculumApi.assign(payload)
      onSaved(enrollment)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="hw-modal-overlay" onClick={onClose}>
      <div className="hw-modal hw-modal--wide stc-wizard" onClick={e => e.stopPropagation()}>
        <div className="stc-wizard-head">
          <h3>{replace ? 'Змінити програму' : 'Призначити програму'}</h3>
          <button type="button" className="sidebar-close" onClick={onClose} aria-label="Закрити">
            <svg viewBox="0 0 24 24" aria-hidden><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        <div className="hw-modal-body">
          {error && <div className="alert">{error}</div>}
          {loading && <Empty label="Завантаження програм…" />}

          {!loading && !pick && (
            <>
              <div className="stc-wizard-tabs">
                <button type="button" className={`btn btn-sm${tab === 'movna' ? ' btn-teal' : ' btn-secondary'}`} onClick={() => setTab('movna')}>Movna</button>
                <button type="button" className={`btn btn-sm${tab === 'custom' ? ' btn-teal' : ' btn-secondary'}`} onClick={() => setTab('custom')}>Власні / спільні</button>
              </div>
              <div className="stc-wizard-programs">
                {(tab === 'movna' ? movnaPrograms : customPrograms).map(program => (
                  <button
                    key={tab === 'movna' ? (program as CurriculumProgram).slug : (program as TeacherCurriculumProgram).id}
                    type="button"
                    className="stc-program-pick"
                    onClick={() => setPick(
                      tab === 'movna'
                        ? { source: 'movna', program: program as CurriculumProgram }
                        : { source: 'custom', program: program as TeacherCurriculumProgram },
                    )}
                  >
                    <span className="stc-program-pick-title">
                      {tab === 'movna' ? (program as CurriculumProgram).name : (program as TeacherCurriculumProgram).title}
                    </span>
                    <span className="stc-program-pick-sub">
                      {tab === 'movna'
                        ? `${(program as CurriculumProgram).module_count} мод. · ${(program as CurriculumProgram).lesson_count} ур.`
                        : `${(program as TeacherCurriculumProgram).module_count} мод. · ${(program as TeacherCurriculumProgram).lesson_count} ур.`}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}

          {!loading && pick && (
            <>
              <button type="button" className="btn btn-sm btn-secondary" onClick={() => setPick(null)}>← Інша програма</button>
              <p className="stc-wizard-hint">Оберіть модуль і урок, з якого почати (якщо частину вже пройдено).</p>
              <div className="stc-start-grid">
                <label className="stc-field">
                  <span>Модуль</span>
                  <select className="input" value={startModule} onChange={e => { setStartModule(Number(e.target.value)); setStartLesson(0) }}>
                    {modules.map(m => (
                      <option key={m.index} value={m.index}>{m.title}</option>
                    ))}
                  </select>
                </label>
                <label className="stc-field">
                  <span>Урок / тема</span>
                  <select className="input" value={startLesson} onChange={e => setStartLesson(Number(e.target.value))}>
                    {(modules.find(m => m.index === startModule)?.lessons ?? []).map(l => (
                      <option key={l.index} value={l.index}>{l.label}</option>
                    ))}
                  </select>
                </label>
              </div>
            </>
          )}
        </div>

        <div className="hw-modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Скасувати</button>
          <button type="button" className="btn btn-teal" disabled={!pick || saving} onClick={save}>
            {saving ? 'Збереження…' : replace ? 'Замінити програму' : 'Призначити'}
          </button>
        </div>
      </div>
    </div>
  )
}
