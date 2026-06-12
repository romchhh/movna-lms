import { PageHeader, Card, Badge } from '@/components/shared/UI'

const courses = [
  { id: 1, title: 'English Speaking B1→B2', lang: 'English', level: 'B1→B2', modules: 6, lessons: 31, students: 11, sheets: 'https://docs.google.com/spreadsheets', active: true },
  { id: 2, title: 'Ділова англійська B2→C1', lang: 'English', level: 'B2→C1', modules: 5, lessons: 25, students: 3, sheets: '', active: true },
  { id: 3, title: 'Polish A1→B1', lang: 'Polish', level: 'A1→B1', modules: 8, lessons: 40, students: 6, sheets: '', active: false },
]

export default function AdminCourses() {
  return (
    <>
      <PageHeader title="Курси та програми" sub="Управління контентом через Google Sheets">
        <button className="btn btn-sm" style={{ background: 'var(--pl)', color: 'var(--pd)', border: '.5px solid var(--pm)' }}>
          + Новий курс
        </button>
        <button className="btn btn-secondary btn-sm">⟳ Синх. Sheets</button>
      </PageHeader>

      {/* Info banner */}
      <div className="admin-course-banner" style={{ background: 'var(--tl)', border: '.5px solid var(--t)', borderRadius: 'var(--r8)', padding: '12px 16px', fontSize: 13, color: 'var(--td)' }}>
        <span style={{ fontSize: 16 }}>📋</span>
        <div>
          <strong>Google Sheets = джерело програми.</strong> Методист редагує таблицю → натискає «Синх. Sheets» → LMS оновлює курс автоматично. Розробники не потрібні.
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {courses.map(c => (
          <Card key={c.id}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--tx)' }}>{c.title}</span>
                  <Badge variant="purple">{c.level}</Badge>
                  <Badge variant={c.active ? 'teal' : 'gray'}>{c.active ? 'Активний' : 'Архів'}</Badge>
                </div>

                <div style={{ display: 'flex', gap: 20, fontSize: 12, color: 'var(--tx2)', marginBottom: 12, flexWrap: 'wrap' }}>
                  <span>📚 {c.modules} модулів</span>
                  <span>📖 {c.lessons} уроків</span>
                  <span>👥 {c.students} учнів</span>
                  <span>🌐 {c.lang}</span>
                </div>

                {/* Sheets link */}
                <div className="admin-course-actions">
                  <div className="admin-course-sheets-row">
                    <input
                      className="input"
                      defaultValue={c.sheets}
                      placeholder="Google Sheets URL..."
                      style={{ fontSize: 12 }}
                    />
                    <button type="button" className="btn btn-teal btn-sm">⟳ Синх.</button>
                  </div>
                  <button type="button" className="btn btn-secondary btn-sm">✏ Редаг.</button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </>
  )
}
