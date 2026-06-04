'use client'
import { useState } from 'react'
import { PageHeader, Card, Badge, Alert } from '@/components/shared/UI'

const homeworks = [
  {
    id: 1, status: 'late',
    title: 'Есе: Моя улюблена подорож', lesson: 'Модуль 2 · Урок 4',
    deadline: '23.05.2026', score: null, comment: '',
    description: 'Напишіть есе 200-300 слів про вашу найулюбленішу подорож. Використайте Past Simple та Past Perfect.',
    type: 'text',
  },
  {
    id: 2, status: 'pending',
    title: 'Speaking: Опишіть своє місто', lesson: 'Модуль 3 · Урок 1',
    deadline: '28.05.2026', score: null, comment: '',
    description: 'Запишіть аудіо 1-2 хвилини: опишіть місто, де ви живете. Використайте фрази з уроку.',
    type: 'audio',
  },
  {
    id: 3, status: 'reviewed',
    title: 'Читання: Culture Shock Article', lesson: 'Модуль 2 · Урок 3',
    deadline: '20.05.2026', score: 9, comment: 'Чудово! Правильно відповіли на всі запитання. Зверни увагу на вживання артиклів.',
    description: '',
    type: 'text',
  },
]

const statusInfo: Record<string, { label: string; variant: 'red'|'amber'|'teal'|'green'|'gray' }> = {
  late: { label: 'Прострочено', variant: 'red' },
  pending: { label: 'На здачу', variant: 'amber' },
  submitted: { label: 'Здано, очікує', variant: 'purple' as any },
  reviewed: { label: 'Перевірено', variant: 'green' },
}

export default function StudentHomework() {
  const [open, setOpen] = useState<number | null>(null)
  const [text, setText] = useState<Record<number, string>>({})
  const [submitted, setSubmitted] = useState<Set<number>>(new Set())

  return (
    <>
      <PageHeader title="Домашні завдання" sub="3 завдання · 1 прострочено" />

      {homeworks.some(h => h.status === 'late') && (
        <Alert>Є прострочене завдання — здайте якнайшвидше</Alert>
      )}

      {homeworks.map(hw => {
        const si = statusInfo[hw.status] ?? statusInfo.pending
        const isSubmitted = submitted.has(hw.id)
        return (
          <Card key={hw.id}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--tx)' }}>{hw.title}</span>
                  <Badge variant={si.variant}>{isSubmitted ? 'Здано' : si.label}</Badge>
                </div>
                <div style={{ fontSize: 12, color: 'var(--tx2)' }}>{hw.lesson} · Дедлайн: {hw.deadline}</div>
                {hw.type === 'audio' && <div style={{ fontSize: 11, color: 'var(--p)', marginTop: 3 }}>🎙 Формат: аудіозапис</div>}
              </div>

              {hw.status !== 'reviewed' && !isSubmitted && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setOpen(open === hw.id ? null : hw.id)}
                >
                  {open === hw.id ? 'Згорнути' : 'Здати'}
                </button>
              )}
            </div>

            {/* Description */}
            {hw.description && (
              <div style={{ background: 'var(--bg2)', borderRadius: 'var(--r8)', padding: '10px 12px', marginTop: 10, fontSize: 13, color: 'var(--tx2)', lineHeight: 1.6 }}>
                {hw.description}
              </div>
            )}

            {/* Reviewed result */}
            {hw.status === 'reviewed' && hw.score !== null && (
              <div style={{ marginTop: 12, background: 'var(--gl)', borderRadius: 'var(--r8)', padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--gd)' }}>✓ Перевірено</span>
                  <Badge variant="green">{hw.score}/10</Badge>
                </div>
                <div style={{ fontSize: 13, color: 'var(--tx)', lineHeight: 1.6 }}>{hw.comment}</div>
              </div>
            )}

            {/* Submit form */}
            {open === hw.id && (
              <div style={{ marginTop: 12, borderTop: '.5px solid var(--bd)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {hw.type === 'text' ? (
                  <textarea
                    className="input"
                    rows={5}
                    placeholder="Введіть вашу відповідь..."
                    value={text[hw.id] ?? ''}
                    onChange={e => setText(p => ({ ...p, [hw.id]: e.target.value }))}
                    style={{ resize: 'vertical', lineHeight: 1.6 }}
                  />
                ) : (
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ fontSize: 12, color: 'var(--tx2)' }}>Завантажте аудіофайл (MP3, M4A, WAV):</div>
                    <input type="file" accept="audio/*" className="input" style={{ padding: 8 }} />
                  </label>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => { setSubmitted(p => new Set([...p, hw.id])); setOpen(null) }}
                  >
                    ✓ Здати завдання
                  </button>
                  <button className="btn btn-secondary" onClick={() => setOpen(null)}>Скасувати</button>
                </div>
              </div>
            )}
          </Card>
        )
      })}
    </>
  )
}
