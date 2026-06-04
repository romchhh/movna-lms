'use client'
import { useState } from 'react'
import { PageHeader, Card, Badge, Empty } from '@/components/shared/UI'

const materials = [
  { name: 'Модуль 3 · Урок 1 — Презентація.pdf', size: '2.4 MB', type: 'PDF', date: '24.05', lesson: 'M3·U1' },
  { name: 'Словник Модуль 2.docx', size: '340 KB', type: 'DOCX', date: '18.05', lesson: 'M2' },
  { name: 'Culture Shock Article.pdf', size: '1.1 MB', type: 'PDF', date: '20.05', lesson: 'M3·U2' },
  { name: 'Граматика — Present Perfect.pdf', size: '890 KB', type: 'PDF', date: '15.05', lesson: 'M2·U3' },
]

const typeColor: Record<string, { bg: string; c: string }> = {
  PDF:  { bg: '#FCEBEB', c: '#A32D2D' },
  DOCX: { bg: '#EEEDFE', c: '#3C3489' },
  MP4:  { bg: '#E1F5EE', c: '#085041' },
}

export default function TeacherMaterials() {
  const [dragging, setDragging] = useState(false)

  return (
    <>
      <PageHeader title="Матеріали до уроків" sub="Завантажуйте PDF, DOCX, відео" />

      {/* Upload zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false) }}
        style={{
          border: `2px dashed ${dragging ? 'var(--t)' : 'var(--bd2)'}`,
          borderRadius: 'var(--r14)',
          padding: '32px',
          textAlign: 'center',
          background: dragging ? 'var(--tl)' : 'var(--bg2)',
          transition: 'all .15s',
        }}
      >
        <div style={{ fontSize: 28, marginBottom: 8 }}>📎</div>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--tx)', marginBottom: 6 }}>
          Перетягніть файл або
        </div>
        <label className="btn btn-teal" style={{ cursor: 'pointer' }}>
          Обрати файл
          <input type="file" style={{ display: 'none' }} multiple accept=".pdf,.docx,.mp4,.pptx" />
        </label>
        <div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 10 }}>PDF, DOCX, MP4, PPTX · до 100 MB</div>
      </div>

      {/* File list */}
      <Card title="Завантажені матеріали">
        {materials.map((f, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 11px', background: 'var(--bg2)', borderRadius: 'var(--r8)', marginBottom: 8 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 'var(--r8)',
              background: typeColor[f.type]?.bg ?? 'var(--bg3)',
              color: typeColor[f.type]?.c ?? 'var(--tx2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, flexShrink: 0,
            }}>
              {f.type}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
              <div style={{ fontSize: 11, color: 'var(--tx2)', marginTop: 2 }}>{f.size} · {f.date} · {f.lesson}</div>
            </div>
            <button className="btn btn-secondary btn-sm">⬇</button>
            <button className="btn btn-sm" style={{ background: 'var(--rl)', color: 'var(--rd)' }}>✕</button>
          </div>
        ))}
      </Card>
    </>
  )
}
