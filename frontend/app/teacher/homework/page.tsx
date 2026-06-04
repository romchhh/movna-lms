'use client'
import { useState } from 'react'
import { PageHeader, Alert, Badge, Card, Empty } from '@/components/shared/UI'

const MOCK = [
  {
    id: 1, urgent: true,
    student: 'Олена Коваль', init: 'ОК', bg: '#EEEDFE', c: '#534AB7',
    task: 'Есе: Моя улюблена подорож', lesson: 'Модуль 2 · Урок 4',
    type: 'text', when: '3 дні тому',
    answer: 'Моя улюблена подорож — поїздка до Карпат влітку 2023 року. Ми їхали невеликою компанією друзів і зупинились у маленькому будинку біля річки...',
    status: 'submitted',
  },
  {
    id: 2, urgent: false,
    student: 'Дмитро Сич', init: 'ДС', bg: '#FCEBEB', c: '#E24B4A',
    task: 'Speaking: Місто мрії', lesson: 'Модуль 3 · Урок 1',
    type: 'audio', when: '1 день тому',
    answer: '[Аудіозапис · 2:34]',
    status: 'submitted',
  },
  {
    id: 3, urgent: false,
    student: 'Аліна Бондар', init: 'АБ', bg: '#FAEEDA', c: '#BA7517',
    task: 'Читання: Culture Shock Article', lesson: 'Модуль 3 · Урок 2',
    type: 'text', when: 'Сьогодні',
    answer: 'Culture shock is a feeling of disorientation that people experience when they move to a new country or culture...',
    status: 'submitted',
  },
]

type Filter = 'all' | 'urgent' | 'new'

export default function TeacherHomework() {
  const [filter, setFilter] = useState<Filter>('all')
  const [reviewing, setReviewing] = useState<number | null>(null)
  const [scores, setScores] = useState<Record<number, string>>({})
  const [comments, setComments] = useState<Record<number, string>>({})
  const [done, setDone] = useState<Set<number>>(new Set())

  const filtered = MOCK.filter(hw => {
    if (done.has(hw.id)) return false
    if (filter === 'urgent') return hw.urgent
    if (filter === 'new') return !hw.urgent
    return true
  })

  function submit(id: number) {
    setDone(prev => new Set([...prev, id]))
    setReviewing(null)
  }

  return (
    <>
      <PageHeader title="Перевірка домашніх завдань" sub={`${filtered.length} завдань очікують`} />

      {MOCK.some(h => h.urgent && !done.has(h.id)) && (
        <Alert>Є прострочені завдання — перевірте в першу чергу</Alert>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8 }}>
        {(['all', 'urgent', 'new'] as Filter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="btn btn-sm"
            style={{
              background: filter === f ? 'var(--tl)' : 'var(--bg2)',
              color: filter === f ? 'var(--td)' : 'var(--tx2)',
              border: `.5px solid ${filter === f ? 'var(--t)' : 'var(--bd2)'}`,
            }}
          >
            {{ all: 'Всі', urgent: '🔴 Прострочені', new: '🟢 Нові' }[f]}
          </button>
        ))}
      </div>

      {filtered.length === 0 && <Empty label="Чудово! Усі завдання перевірено ✓" />}

      {filtered.map(hw => (
        <Card key={hw.id}>
          {/* HW header */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: hw.bg, color: hw.c, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 500, flexShrink: 0 }}>
              {hw.init}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--tx)' }}>{hw.student}</span>
                {hw.urgent && <Badge variant="red">Прострочено</Badge>}
              </div>
              <div style={{ fontSize: 12, color: 'var(--tx2)', marginTop: 2 }}>{hw.task} · {hw.lesson}</div>
              <div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 1 }}>Здано: {hw.when}</div>
            </div>
            <button
              onClick={() => setReviewing(reviewing === hw.id ? null : hw.id)}
              className="btn btn-teal btn-sm"
            >
              {reviewing === hw.id ? 'Згорнути' : 'Перевірити'}
            </button>
          </div>

          {/* Answer preview */}
          <div style={{ background: 'var(--bg2)', borderRadius: 'var(--r8)', padding: '11px 13px', marginTop: 12, fontSize: 13, color: 'var(--tx)', lineHeight: 1.6 }}>
            {hw.answer}
          </div>

          {/* Review form */}
          {reviewing === hw.id && (
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10, borderTop: '.5px solid var(--bd)', paddingTop: 14 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <label style={{ fontSize: 12, color: 'var(--tx2)', flexShrink: 0 }}>Оцінка (з 10):</label>
                <input
                  className="input"
                  type="number" min={0} max={10} step={0.5}
                  placeholder="напр. 8.5"
                  value={scores[hw.id] ?? ''}
                  onChange={e => setScores(p => ({ ...p, [hw.id]: e.target.value }))}
                  style={{ width: 100 }}
                />
                {/* Quick grade buttons */}
                <div style={{ display: 'flex', gap: 6 }}>
                  {[6, 7, 8, 9, 10].map(n => (
                    <button
                      key={n}
                      onClick={() => setScores(p => ({ ...p, [hw.id]: String(n) }))}
                      className="btn btn-sm"
                      style={{
                        background: scores[hw.id] === String(n) ? 'var(--tl)' : 'var(--bg2)',
                        color: scores[hw.id] === String(n) ? 'var(--td)' : 'var(--tx2)',
                        border: `.5px solid var(--bd2)`,
                        padding: '4px 10px',
                      }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--tx2)', display: 'block', marginBottom: 5 }}>Коментар викладача:</label>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="Загалом добре! Зверни увагу на..."
                  value={comments[hw.id] ?? ''}
                  onChange={e => setComments(p => ({ ...p, [hw.id]: e.target.value }))}
                  style={{ resize: 'vertical', lineHeight: 1.5 }}
                />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-teal"
                  disabled={!scores[hw.id]}
                  onClick={() => submit(hw.id)}
                >
                  ✓ Зберегти оцінку
                </button>
                <button className="btn btn-secondary" onClick={() => setReviewing(null)}>Скасувати</button>
              </div>
            </div>
          )}
        </Card>
      ))}
    </>
  )
}
