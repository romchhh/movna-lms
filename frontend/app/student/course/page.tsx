import { PageHeader, Card, ProgressBar, Badge } from '@/components/shared/UI'

const modules = [
  {
    id: 1, title: 'Вступ та знайомство', lessons: 3, done: 3, status: 'done',
    lessons_list: [
      { title: 'Урок 1. Привітання та самопрезентація', status: 'done', score: 9 },
      { title: 'Урок 2. Базові фрази', status: 'done', score: 10 },
      { title: 'Урок 3. Знайомство в контексті', status: 'done', score: 8 },
    ],
  },
  {
    id: 2, title: 'Модуль 1: Повсякденне спілкування', lessons: 5, done: 5, status: 'done',
    lessons_list: [],
  },
  {
    id: 3, title: 'Модуль 2: Робота і кар\'єра', lessons: 5, done: 5, status: 'done',
    lessons_list: [],
  },
  {
    id: 4, title: 'Модуль 3: Подорожі та культура', lessons: 5, done: 2, status: 'current',
    lessons_list: [
      { title: 'Урок 1. Планування подорожі', status: 'done', score: 9 },
      { title: 'Урок 2. Аеропорт та транспорт', status: 'current', score: null },
      { title: 'Урок 3. Готель та бронювання', status: 'locked', score: null },
      { title: 'Урок 4. Culture shock', status: 'locked', score: null },
      { title: 'Урок 5. Підсумок модуля', status: 'locked', score: null },
    ],
  },
  {
    id: 5, title: 'Модуль 4: Аргументація та дискусія', lessons: 6, done: 0, status: 'locked',
    lessons_list: [],
  },
  {
    id: 6, title: 'Модуль 5: Презентація ідей', lessons: 5, done: 0, status: 'locked',
    lessons_list: [],
  },
  {
    id: 7, title: 'Модуль 6: Підсумок курсу', lessons: 7, done: 0, status: 'locked',
    lessons_list: [],
  },
]

const iconMap = { done: '✓', current: '▶', locked: '🔒' }
const colorMap = { done: { bg: 'var(--gl)', c: '#3B6D11' }, current: { bg: 'var(--pl)', c: 'var(--p)' }, locked: { bg: 'var(--bg3)', c: 'var(--tx3)' } }

export default function StudentCourse() {
  const totalLessons = modules.reduce((a, m) => a + m.lessons, 0)
  const completedLessons = modules.reduce((a, m) => a + m.done, 0)

  return (
    <>
      <PageHeader title="Мій курс" sub="English Speaking B1→B2 · 31 урок" />

      {/* Overall progress */}
      <div style={{ background: 'var(--bg2)', borderRadius: 'var(--r14)', padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx)', marginBottom: 3 }}>Загальний прогрес</div>
            <div style={{ fontSize: 12, color: 'var(--tx2)' }}>{completedLessons} з {totalLessons} уроків завершено</div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 500, color: 'var(--p)' }}>
            {Math.round(completedLessons / totalLessons * 100)}%
          </div>
        </div>
        <ProgressBar pct={Math.round(completedLessons / totalLessons * 100)} color="var(--p)" />
      </div>

      {/* Modules */}
      {modules.map(m => {
        const { bg, c } = colorMap[m.status as keyof typeof colorMap]
        const pct = m.done / m.lessons * 100
        const isExpanded = m.status === 'current'
        return (
          <Card key={m.id}>
            {/* Module header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: bg, color: c, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                {iconMap[m.status as keyof typeof iconMap]}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: m.status === 'locked' ? 'var(--tx2)' : 'var(--tx)', opacity: m.status === 'locked' ? .6 : 1 }}>
                    {m.title}
                  </span>
                  {m.status === 'current' && <Badge variant="purple">Зараз</Badge>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <ProgressBar pct={pct} color={m.status === 'done' ? 'var(--t)' : 'var(--p)'} small />
                  <span style={{ fontSize: 11, color: 'var(--tx2)', flexShrink: 0 }}>{m.done}/{m.lessons}</span>
                </div>
              </div>
            </div>

            {/* Expanded lesson list for current module */}
            {isExpanded && m.lessons_list.length > 0 && (
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: '.5px solid var(--bd)' }}>
                {m.lessons_list.map((l, li) => {
                  const lc = colorMap[l.status as keyof typeof colorMap]
                  return (
                    <div key={li} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 10px', borderRadius: 'var(--r8)',
                      background: l.status === 'current' ? 'var(--bg2)' : 'transparent',
                      marginBottom: 4,
                      opacity: l.status === 'locked' ? .5 : 1,
                    }}>
                      <div style={{ width: 22, height: 22, borderRadius: 6, background: lc.bg, color: lc.c, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0 }}>
                        {iconMap[l.status as keyof typeof iconMap]}
                      </div>
                      <span style={{ flex: 1, fontSize: 13, color: 'var(--tx)' }}>{l.title}</span>
                      {l.score !== null && (
                        <Badge variant="green">{l.score}/10</Badge>
                      )}
                      {l.status === 'current' && (
                        <button className="btn btn-primary btn-sm">Продовжити →</button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        )
      })}
    </>
  )
}
