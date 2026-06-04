import { PageHeader, Card, Badge } from '@/components/shared/UI'

const students = ['Олена К.', 'Максим П.', 'Аліна Б.', 'Дмитро С.']
const lessons  = ['Ур.1', 'Ур.2', 'Ур.3', 'Ур.4', 'Ур.5', 'Ур.6', 'Ур.7']

const grades: (number | null)[][] = [
  [9, 8, 10, 7, null, null, null],
  [10, 9, 10, 9, 8,   null, null],
  [7, 6, null, 8, null, null, null],
  [8, 9, 7, null, null, null, null],
]

function gradeColor(g: number | null) {
  if (g === null) return { bg: 'var(--bg3)', color: 'var(--tx3)' }
  if (g >= 9) return { bg: 'var(--gl)', color: 'var(--gd)' }
  if (g >= 7) return { bg: 'var(--pl)', color: 'var(--pd)' }
  return { bg: 'var(--al)', color: '#633806' }
}

function avg(row: (number | null)[]) {
  const filled = row.filter(Boolean) as number[]
  if (!filled.length) return '—'
  return (filled.reduce((a, b) => a + b, 0) / filled.length).toFixed(1)
}

export default function TeacherGrades() {
  return (
    <>
      <PageHeader title="Журнал оцінок" sub="English Speaking B1→B2">
        <select className="input" style={{ width: 'auto', fontSize: 12 }}>
          <option>English Speaking B1→B2</option>
          <option>Ділова англійська B2→C1</option>
        </select>
        <button className="btn btn-secondary btn-sm">⬇ Експорт CSV</button>
      </PageHeader>

      <Card>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '8px 12px 8px 0', fontSize: 11, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: 500, whiteSpace: 'nowrap' }}>
                  Учень
                </th>
                {lessons.map(l => (
                  <th key={l} style={{ padding: '8px 6px', fontSize: 11, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: 500, textAlign: 'center' }}>
                    {l}
                  </th>
                ))}
                <th style={{ padding: '8px 6px', fontSize: 11, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: 500, textAlign: 'center' }}>
                  Сер.
                </th>
              </tr>
            </thead>
            <tbody>
              {students.map((student, si) => (
                <tr key={si} style={{ borderTop: '.5px solid var(--bd)' }}>
                  <td style={{ padding: '10px 12px 10px 0', fontWeight: 500, color: 'var(--tx)', whiteSpace: 'nowrap' }}>
                    {student}
                  </td>
                  {grades[si].map((g, gi) => {
                    const { bg, color } = gradeColor(g)
                    return (
                      <td key={gi} style={{ padding: '6px', textAlign: 'center' }}>
                        <div style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: 32, height: 28, borderRadius: 6,
                          background: bg, color, fontSize: 12, fontWeight: 500,
                        }}>
                          {g ?? '—'}
                        </div>
                      </td>
                    )
                  })}
                  <td style={{ padding: '6px', textAlign: 'center' }}>
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: 40, height: 28, borderRadius: 6,
                      background: 'var(--bg2)', fontSize: 12, fontWeight: 600, color: 'var(--tx)',
                    }}>
                      {avg(grades[si])}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 16, marginTop: 16, paddingTop: 12, borderTop: '.5px solid var(--bd)', flexWrap: 'wrap' }}>
          {[
            { label: '9–10 · Відмінно', bg: 'var(--gl)', c: 'var(--gd)' },
            { label: '7–8 · Добре', bg: 'var(--pl)', c: 'var(--pd)' },
            { label: '1–6 · Потрібна увага', bg: 'var(--al)', c: '#633806' },
            { label: '— · Не здано', bg: 'var(--bg3)', c: 'var(--tx3)' },
          ].map(({ label, bg, c }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--tx2)' }}>
              <div style={{ width: 20, height: 16, borderRadius: 4, background: bg }} />
              <span style={{ color: c }}>{label}</span>
            </div>
          ))}
        </div>
      </Card>
    </>
  )
}
