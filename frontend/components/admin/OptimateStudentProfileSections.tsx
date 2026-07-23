'use client'

import { OptimateNotesList } from '@/components/admin/OptimateNotesList'
import { PortalLoginPasswordPanel } from '@/components/admin/PortalLoginPasswordPanel'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ProductSummary, zipStudentTeachers } from '@/lib/admin-optimate-api'
import { formatKyivDateTime } from '@/lib/optimate-api'

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  if (!children) return null
  return (
    <section className="optimate-detail-section">
      <h3>{title}</h3>
      {children}
    </section>
  )
}

function KeyValue({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="optimate-detail-kv">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function ProductsTable({ products }: { products: ProductSummary[] }) {
  if (!products.length) return <p className="optimate-detail-empty">Немає продуктів</p>
  return (
    <div className="optimate-detail-table-wrap">
      <table className="optimate-detail-table">
        <thead>
          <tr>
            <th>Продукт</th>
            <th>Залишок</th>
            <th>Всього</th>
            <th>Використано</th>
          </tr>
        </thead>
        <tbody>
          {products.map(p => (
            <tr key={p.product_id || p.product_name}>
              <td>{p.product_name}</td>
              <td>{p.lessons_remaining}</td>
              <td>{p.lessons_total}</td>
              <td>{p.lessons_used}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ContactsList({ contacts }: { contacts: { type: string; value: string }[] }) {
  if (!contacts?.length) return <p className="optimate-detail-empty">Контактів немає</p>
  return (
    <div className="optimate-detail-list">
      {contacts.map((c, i) => (
        <div key={`${c.type}-${i}`} className="optimate-detail-list-item">
          <span>{c.type}</span>
          <strong>{c.value}</strong>
        </div>
      ))}
    </div>
  )
}

interface OptimateStudentProfileSectionsProps {
  data: Record<string, unknown>
  entityId: string
  audience?: 'admin' | 'teacher'
  onTeacherClick?: (teacherId: string, teacherName: string) => void
  showNotes?: boolean
}

export function OptimateStudentProfileSections({
  data,
  entityId,
  audience = 'teacher',
  onTeacherClick,
  showNotes = true,
}: OptimateStudentProfileSectionsProps) {
  const productsSummary = (data.products_summary as ProductSummary[] | undefined) ?? []
  const contacts = (data.contacts as { type: string; value: string }[] | undefined) ?? []
  const studentTeachers = zipStudentTeachers({
    teacher_ids: data.teacher_ids as string[] | undefined,
    teacher_names: data.teacher_names as string[] | undefined,
  })
  const notes = (data.notes as unknown[] | undefined) ?? []
  const birthDate = data.birth_date as { day?: number; month?: number; year?: number } | undefined

  return (
    <>
      <DetailSection title="Основне">
        <div className="optimate-detail-grid">
          <KeyValue label="ID" value={String(data.id ?? '')} />
          <KeyValue label="Статус" value={
            <StatusBadge
              label={String(data.status_label ?? '')}
              status={Number(data.status ?? 0)}
            />
          } />
          <KeyValue label="Рівень" value={String(data.skill_level_label ?? '—')} />
          <KeyValue label="Дитина" value={data.is_child ? 'Так' : 'Ні'} />
          <KeyValue label="Залишок уроків" value={String(data.remaining_lessons ?? 0)} />
          <KeyValue label="Заплановано" value={String(data.planned_lessons ?? 0)} />
          <KeyValue label="Проведено" value={String(data.completed_lessons ?? 0)} />
          {birthDate && (
            <KeyValue
              label="Дата народження"
              value={`${birthDate.day ?? '?'}.${birthDate.month ?? '?'}.${birthDate.year ?? '?'}`}
            />
          )}
          {Boolean(data.chat_url) && (
            <KeyValue label="Чат" value={
              <a href={String(data.chat_url)} target="_blank" rel="noopener noreferrer">Telegram</a>
            } />
          )}
        </div>
      </DetailSection>

      <DetailSection title="Контакти">
        <ContactsList contacts={contacts} />
      </DetailSection>

      {audience === 'admin' && (
        <DetailSection title="Вхід у LMS">
          <KeyValue
            label="Останній вхід (Київ)"
            value={formatKyivDateTime(data.last_login_at as string | null | undefined)}
          />
          <PortalLoginPasswordPanel kind="student" optimateId={entityId} />
        </DetailSection>
      )}

      <DetailSection title="Продукти та баланси">
        <ProductsTable products={productsSummary} />
      </DetailSection>

      <DetailSection title="Викладачі">
        {studentTeachers.length ? (
          <div className="optimate-detail-tags">
            {studentTeachers.map(teacher => {
              const clickable = Boolean(onTeacherClick && teacher.id)
              const Tag = clickable ? 'button' : 'span'
              return (
                <Tag
                  key={`${teacher.id}-${teacher.name}`}
                  type={clickable ? 'button' : undefined}
                  className={`cal-participant-chip${clickable ? ' cal-participant-chip--link' : ''}`}
                  onClick={clickable
                    ? () => onTeacherClick!(teacher.id, teacher.name)
                    : undefined}
                >
                  {teacher.name}
                </Tag>
              )
            })}
          </div>
        ) : (
          <p className="optimate-detail-empty">Викладачів не призначено</p>
        )}
      </DetailSection>

      {showNotes && notes.length > 0 && (
        <DetailSection title="Нотатки">
          <OptimateNotesList notes={notes} />
        </DetailSection>
      )}
    </>
  )
}
