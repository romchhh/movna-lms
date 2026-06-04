import { PageHeader, Card, ProgressBar } from '@/components/shared/UI'

const weekly = [
  { day: 'Пн', val: 2 }, { day: 'Вт', val: 0 }, { day: 'Ср', val: 1 },
  { day: 'Чт', val: 3 }, { day: 'Пт', val: 1 }, { day: 'Сб', val: 0 }, { day: 'Нд', val: 2 },
]
const maxVal = Math.max(...weekly.map(w => w.val), 1)

const skills = [
  { label: 'Speaking',  pct: 72 },
  { label: 'Listening', pct: 65 },
  { label: 'Reading',   pct: 80 },
  { label: 'Writing',   pct: 58 },
  { label: 'Grammar',   pct: 70 },
  { label: 'Vocabulary', pct: 55 },
]

export default function StudentStats() {
  return (
    <>
      <PageHeader title="Моя статистика" sub="English Speaking B1→B2" />

      <div className="g4">
        {[
          { label: 'Завершено уроків', value: '13' },
          { label: 'Д/з здано', value: '11' },
          { label: 'Середня оцінка', value: '8.4' },
          { label: 'Активних днів', value: '23' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="g2">
        {/* Activity chart */}
        <Card title="Активність за тиждень (уроків)">
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 90, marginBottom: 6 }}>
            {weekly.map((w, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ fontSize: 11, color: 'var(--tx3)' }}>{w.val || ''}</div>
                <div style={{ width: '100%', background: 'var(--pl)', borderRadius: '3px 3px 0 0', height: 70, position: 'relative' }}>
                  <div style={{
                    position: 'absolute', bottom: 0, width: '100%',
                    background: w.val > 0 ? 'var(--p)' : 'transparent',
                    borderRadius: '3px 3px 0 0',
                    height: `${(w.val / maxVal) * 100}%`,
                  }} />
                </div>
                <div style={{ fontSize: 10, color: 'var(--tx3)' }}>{w.day}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--al)', borderRadius: 'var(--r8)', padding: '6px 12px', marginTop: 8 }}>
            <span style={{ fontSize: 16 }}>🔥</span>
            <span style={{ fontSize: 12, fontWeight: 500, color: '#633806' }}>14 днів поспіль — рекорд!</span>
          </div>
        </Card>

        {/* Skills breakdown */}
        <Card title="Навички">
          {skills.map(s => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: 'var(--tx)', width: 90, flexShrink: 0 }}>{s.label}</div>
              <div style={{ flex: 1 }}>
                <ProgressBar pct={s.pct} color={s.pct >= 70 ? 'var(--t)' : s.pct >= 55 ? 'var(--p)' : 'var(--a)'} small />
              </div>
              <div style={{ fontSize: 11, color: 'var(--tx2)', width: 32, textAlign: 'right' }}>{s.pct}%</div>
            </div>
          ))}
        </Card>
      </div>
    </>
  )
}
