'use client'

import { Badge, Empty, ProgressBar } from '@/components/shared/UI'
import {
  studentCurriculumApi,
  slotStatusLabel,
  type CurriculumSlot,
  type StudentCurriculumOverview,
} from '@/lib/student-curriculum-api'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'

function formatEventDate(iso: string): string {
  if (!iso) return ''
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

function upcomingSlots(slots: CurriculumSlot[], limit = 5): CurriculumSlot[] {
  const scheduled = slots
    .filter(s => s.status === 'scheduled' && s.event_starts_at)
    .sort((a, b) => a.event_starts_at.localeCompare(b.event_starts_at))
  const pending = slots.filter(s => s.status === 'pending')
  return [...scheduled, ...pending].slice(0, limit)
}

interface StudentCurriculumSummaryProps {
  compact?: boolean
  showLink?: boolean
}

export function StudentCurriculumSummary({ compact = false, showLink = true }: StudentCurriculumSummaryProps) {
  const [overview, setOverview] = useState<StudentCurriculumOverview | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setOverview(await studentCurriculumApi.overview())
    } catch {
      setOverview(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const active = overview?.active
  const nextTopics = useMemo(
    () => (active ? upcomingSlots(active.slots) : []),
    [active],
  )

  if (loading) {
    return compact
      ? <p className="stc-summary-muted">Завантаження програми…</p>
      : <Empty label="Завантаження програми…" />
  }

  if (!active) {
    return compact
      ? <p className="stc-summary-muted">Програму ще не призначено</p>
      : <Empty label="Активну програму ще не призначено — зверніться до викладача" />
  }

  return (
    <div className={`stc-summary${compact ? ' stc-summary--compact' : ''}`}>
      <div className="stc-summary-head">
        <div>
          <div className="stc-summary-label">Навчальна програма</div>
          <h3 className="stc-summary-program">{active.program_title}</h3>
          {!compact && (
            <p className="stc-summary-meta">
              {active.completed_slots} з {active.total_slots} тем пройдено
              {active.teacher_name ? ` · ${active.teacher_name}` : ''}
            </p>
          )}
        </div>
        <Badge variant="purple">{active.progress_pct}%</Badge>
      </div>

      <ProgressBar pct={active.progress_pct} color="var(--p)" small={compact} />

      {nextTopics.length > 0 && (
        <div className="stc-summary-topics">
          <div className="stc-summary-topics-label">
            {compact ? 'Наступні теми' : 'Мої теми · найближчі уроки'}
          </div>
          <ul className="stc-summary-topic-list">
            {nextTopics.map(slot => (
              <li key={slot.id} className="stc-summary-topic-row">
                <span className="stc-summary-topic-num">{slot.sequence_index + 1}</span>
                <div className="stc-summary-topic-body">
                  <span className="stc-summary-topic-title">{slot.display_topic || slot.topic || '—'}</span>
                  <span className="stc-summary-topic-sub">
                    {slot.module_title}
                    {slot.event_starts_at ? ` · ${formatEventDate(slot.event_starts_at)}` : ''}
                  </span>
                </div>
                <Badge variant={slot.status === 'scheduled' ? 'amber' : 'gray'}>
                  {slotStatusLabel(slot.status)}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showLink && (
        <Link href="/student/curriculum" className="btn btn-secondary btn-sm btn-full stc-summary-link">
          Вся програма та історія
        </Link>
      )}
    </div>
  )
}
