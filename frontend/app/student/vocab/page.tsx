'use client'
import { useState } from 'react'
import { PageHeader, Card, Badge } from '@/components/shared/UI'

const words = [
  { word: 'commute', translation: 'щоденна поїздка на роботу', example: 'My daily commute takes 40 minutes.', module: 'M2', learned: true },
  { word: 'sustainable', translation: 'стійкий, екологічний', example: 'We need sustainable energy sources.', module: 'M3', learned: true },
  { word: 'itinerary', translation: 'маршрут, план поїздки', example: 'She planned the whole itinerary herself.', module: 'M3', learned: false },
  { word: 'negotiate', translation: 'переговорювати, домовлятись', example: 'They negotiated a better deal.', module: 'M2', learned: false },
  { word: 'versatile', translation: 'різносторонній', example: 'She is a versatile employee.', module: 'M2', learned: true },
  { word: 'endeavour', translation: 'намагатись, прагнення', example: 'In every endeavour, she gave her best.', module: 'M1', learned: true },
]

export default function StudentVocab() {
  const [flip, setFlip] = useState<Set<number>>(new Set())
  const [filter, setFilter] = useState<'all' | 'new' | 'learned'>('all')

  const filtered = words.filter(w =>
    filter === 'all' ? true : filter === 'learned' ? w.learned : !w.learned
  )

  return (
    <>
      <PageHeader title="Мій словник" sub={`${words.length} слів · ${words.filter(w => w.learned).length} вивчено`} />

      <div style={{ display: 'flex', gap: 8 }}>
        {(['all', 'new', 'learned'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="btn btn-sm"
            style={{
              background: filter === f ? 'var(--pl)' : 'var(--bg2)',
              color: filter === f ? 'var(--pd)' : 'var(--tx2)',
              border: `.5px solid ${filter === f ? 'var(--pm)' : 'var(--bd2)'}`,
            }}>
            {{ all: 'Всі', new: 'Нові', learned: '✓ Вивчені' }[f]}
          </button>
        ))}
      </div>

      <div className="vocab-grid">
        {filtered.map((w, i) => (
          <div key={i}
            onClick={() => setFlip(p => { const n = new Set(p); n.has(i) ? n.delete(i) : n.add(i); return n })}
            style={{
              background: flip.has(i) ? 'var(--pl)' : 'var(--bg2)',
              border: `.5px solid ${flip.has(i) ? 'var(--pm)' : 'var(--bd)'}`,
              borderRadius: 'var(--r12)', padding: '14px 15px', cursor: 'pointer',
              transition: 'all .15s', minHeight: 100,
            }}>
            {!flip.has(i) ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--tx)' }}>{w.word}</span>
                  <Badge variant={w.learned ? 'green' : 'gray'}>{w.module}</Badge>
                </div>
                <div style={{ fontSize: 11, color: 'var(--tx3)' }}>Натисніть щоб побачити переклад</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--pd)', marginBottom: 5 }}>{w.translation}</div>
                <div style={{ fontSize: 12, color: 'var(--tx2)', fontStyle: 'italic', lineHeight: 1.5 }}>{w.example}</div>
              </>
            )}
          </div>
        ))}
      </div>
    </>
  )
}
