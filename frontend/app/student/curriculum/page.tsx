'use client'

import { StudentCurriculumSummary } from '@/components/curriculum/StudentCurriculumSummary'
import {
  studentCurriculumApi,
  slotStatusLabel,
  type EnrollmentDetail,
  type EnrollmentSummary,
  type StudentCurriculumOverview,
} from '@/lib/student-curriculum-api'
import { Badge, Card, Empty, PageHeader, ProgressBar } from '@/components/shared/UI'
import { useCallback, useEffect, useState } from 'react'

function moduleState(mod: EnrollmentDetail['modules'][0]): 'done' | 'active' | 'pending' {
  if (mod.completed_slots >= mod.total_slots && mod.total_slots > 0) return 'done'
  if (mod.completed_slots > 0) return 'active'
  const hasScheduled = mod.slots.some(s => s.status === 'scheduled' || s.status === 'completed')
  return hasScheduled ? 'active' : 'pending'
}

function HistoryCard({ item, onOpen }: { item: EnrollmentSummary; onOpen: () => void }) {
  return (
    <button type="button" className="stc-lib-history-card" onClick={onOpen}>
      <div className="stc-lib-history-title">{item.program_title}</div>
      <div className="stc-lib-history-meta">
        {item.teacher_name ? `${item.teacher_name} · ` : ''}
        {item.completed_slots}/{item.total_slots} тем · {item.progress_pct}%
      </div>
      {item.ended_at && (
        <div className="stc-lib-history-date">
          завершено {new Date(item.ended_at).toLocaleDateString('uk-UA')}
        </div>
      )}
    </button>
  )
}

function EnrollmentView({ enrollment, onBack }: { enrollment: EnrollmentDetail; onBack?: () => void }) {
  return (
    <div className="stc-lib-detail">
      {onBack && (
        <button type="button" className="btn btn-sm btn-secondary" onClick={onBack}>← Назад</button>
      )}
      <div className="stc-lib-hero">
        <div>
          <div className="stc-summary-label">Навчальна програма</div>
          <h3>{enrollment.program_title}</h3>
          <p className="stc-lib-hero-sub">
            {enrollment.status === 'active' ? 'Поточна програма' : 'Архівна програма'}
            {enrollment.teacher_name ? ` · ${enrollment.teacher_name}` : ''}
          </p>
        </div>
        <Badge variant={enrollment.status === 'active' ? 'teal' : 'gray'}>
          {enrollment.progress_pct}%
        </Badge>
      </div>
      <ProgressBar pct={enrollment.progress_pct} color="var(--p)" />

      <div className="stc-lib-modules">
        {enrollment.modules.map(mod => {
          const state = moduleState(mod)
          return (
            <Card key={mod.module_index} className={`stc-lib-module stc-lib-module--${state}`}>
              <div className="stc-lib-module-head">
                <div>
                  <div className="card-title">{mod.module_title}</div>
                  <p className="stc-lib-module-sub">{mod.completed_slots}/{mod.total_slots} тем</p>
                </div>
                <Badge variant={state === 'done' ? 'green' : state === 'active' ? 'purple' : 'gray'}>
                  {state === 'done' ? 'Пройдено' : state === 'active' ? 'В процесі' : 'Очікує'}
                </Badge>
              </div>
              <div className="stc-lib-lessons">
                {mod.slots.map(slot => (
                  <div key={slot.id} className={`stc-lib-lesson stc-lib-lesson--${slot.status}`}>
                    <span className="stc-lib-lesson-num">{slot.sequence_index + 1}</span>
                    <div className="stc-lib-lesson-body">
                      <div className="stc-lib-lesson-topic">{slot.display_topic || slot.topic || '—'}</div>
                      {slot.lesson_type && <div className="stc-lib-lesson-type">{slot.lesson_type}</div>}
                      {slot.student_activities && (
                        <p className="stc-lib-lesson-activities">{slot.student_activities}</p>
                      )}
                    </div>
                    <Badge variant={slot.status === 'completed' ? 'green' : slot.status === 'scheduled' ? 'amber' : 'gray'}>
                      {slotStatusLabel(slot.status)}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

export default function StudentCurriculumPage() {
  const [overview, setOverview] = useState<StudentCurriculumOverview | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selectedDetail, setSelectedDetail] = useState<EnrollmentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setOverview(await studentCurriculumApi.overview())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function openEnrollment(id: number) {
    setLoading(true)
    setError('')
    try {
      const detail = await studentCurriculumApi.enrollment(id)
      setSelectedId(id)
      setSelectedDetail(detail)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка')
    } finally {
      setLoading(false)
    }
  }

  if (selectedDetail) {
    return (
      <>
        <PageHeader title="Моя навчальна програма" sub="Бібліотека знань та прогрес" />
        {error && <div className="alert">{error}</div>}
        <EnrollmentView enrollment={selectedDetail} onBack={() => { setSelectedDetail(null); setSelectedId(null) }} />
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Моя навчальна програма"
        sub="Прогрес, теми уроків та історія навчання з Movna"
      />

      {error && <div className="alert">{error}</div>}
      {loading && !overview && <Empty label="Завантаження…" />}

      {!loading && overview?.active && (
        <Card className="stc-lib-active-wrap">
          <StudentCurriculumSummary showLink={false} />
          <button
            type="button"
            className="btn btn-teal btn-sm"
            style={{ marginTop: 12 }}
            onClick={() => openEnrollment(overview.active!.id)}
          >
            Всі модулі та теми
          </button>
        </Card>
      )}

      {!loading && !overview?.active && (
        <Empty label="Активну програму ще не призначено — зверніться до викладача" />
      )}

      {(overview?.history.length ?? 0) > 0 && (
        <section className="stc-lib-history">
          <h3 className="stc-lib-section-title">Історія програм</h3>
          <p className="stc-lib-section-sub">Попередні програми та прогрес зберігаються навіть після зміни викладача</p>
          <div className="stc-lib-history-grid">
            {overview!.history.map(item => (
              <HistoryCard key={item.id} item={item} onOpen={() => openEnrollment(item.id)} />
            ))}
          </div>
        </section>
      )}
    </>
  )
}
