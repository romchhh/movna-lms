'use client'

import { Badge } from '@/components/shared/UI'
import { CacheMeta, formatCacheAge } from '@/lib/optimate-api'
import { ProductSummary, stripHtml, zipStudentTeachers } from '@/lib/admin-optimate-api'
import { statusBadgeVariant } from '@/lib/optimate-ui'
import { PortalLoginPasswordPanel } from '@/components/admin/PortalLoginPasswordPanel'
import { OptimateNotesList } from '@/components/admin/OptimateNotesList'
import { TeacherLessonStatsPanel } from '@/components/teacher/TeacherLessonStatsPanel'
import type { TeacherLessonStats } from '@/lib/teacher-optimate-api'
import { CloseIcon, IconButton, RefreshIcon } from '@/components/shared/Icons'
import { useEffect } from 'react'

interface OptimateEntityModalProps {
  open: boolean
  title: string
  entityId?: string | null
  loading: boolean
  error?: string
  data: Record<string, unknown> | null
  cache: CacheMeta | null
  onClose: () => void
  onRefresh: () => void
  kind: 'student' | 'teacher'
  overlayClassName?: string
  audience?: 'admin' | 'teacher'
  onTeacherClick?: (teacherId: string, teacherName: string) => void
  lessonStats?: TeacherLessonStats | null
  lessonStatsLoading?: boolean
}

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

export function OptimateEntityModal({
  open,
  title,
  entityId,
  loading,
  error,
  data,
  cache,
  onClose,
  onRefresh,
  kind,
  overlayClassName,
  onTeacherClick,
  audience = 'admin',
  lessonStats,
  lessonStatsLoading,
}: OptimateEntityModalProps) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const resolvedEntityId = entityId ?? (data?.id != null ? String(data.id) : null)
  const productsSummary = (data?.products_summary as ProductSummary[] | undefined) ?? []
  const contacts = (data?.contacts as { type: string; value: string }[] | undefined) ?? []
  const studentTeachers = kind === 'student' && data
    ? zipStudentTeachers({
        teacher_ids: data.teacher_ids as string[] | undefined,
        teacher_names: data.teacher_names as string[] | undefined,
      })
    : []
  const notes = (data?.notes as unknown[] | undefined) ?? []
  const stats = (data?.stats as Record<string, unknown> | undefined) ?? {}
  const birthDate = data?.birth_date as { day?: number; month?: number; year?: number } | undefined

  return (
    <div className={`optimate-modal-overlay${overlayClassName ? ` ${overlayClassName}` : ''}`} onClick={onClose}>
      <div className="optimate-modal" onClick={e => e.stopPropagation()}>
        <div className="optimate-modal-header">
          <div>
            <h2>{title}</h2>
            {audience === 'admin' && cache && (
              <p className="optimate-modal-meta">
                Optimate · {formatCacheAge(cache.synced_at)}{cache.cached ? ' · кеш' : ' · свіжі дані'}
              </p>
            )}
          </div>
          <div className="optimate-modal-actions">
            <IconButton
              label="Оновити"
              onClick={onRefresh}
              loading={loading}
            >
              <RefreshIcon />
            </IconButton>
            <IconButton label="Закрити" onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </div>
        </div>

        <div className="optimate-modal-body">
          {loading && !data && <p>Завантаження деталей...</p>}
          {error && <div className="alert">{error}</div>}

          {data && (
            <>
              <DetailSection title="Основне">
                <div className="optimate-detail-grid">
                  <KeyValue label="ID" value={String(data.id ?? '')} />
                  <KeyValue label="Статус" value={
                    <Badge variant={statusBadgeVariant(Number(data.status ?? 0))}>
                      {String(data.status_label ?? '')}
                    </Badge>
                  } />
                  {kind === 'student' && (
                    <>
                      <KeyValue label="Рівень" value={String(data.skill_level_label ?? '—')} />
                      <KeyValue label="Дитина" value={data.is_child ? 'Так' : 'Ні'} />
                      <KeyValue label="Залишок уроків" value={String(data.remaining_lessons ?? 0)} />
                      <KeyValue label="Заплановано" value={String(data.planned_lessons ?? 0)} />
                      <KeyValue label="Проведено" value={String(data.completed_lessons ?? 0)} />
                    </>
                  )}
                  {kind === 'teacher' && (
                    <>
                      <KeyValue label="Учнів" value={String(data.students_count ?? stats.studentsCount ?? '—')} />
                      <KeyValue label="Непроверених уроків" value={String(data.unmarked_lesson_count ?? stats.unmarkedLessonCount ?? '—')} />
                      <KeyValue label="Доступ" value={String(data.auth_status_label ?? '—')} />
                    </>
                  )}
                  {birthDate && (
                    <KeyValue
                      label="Дата народження"
                      value={`${birthDate.day ?? '?'}.${birthDate.month ?? '?'}.${birthDate.year ?? '?'}`}
                    />
                  )}
                  {kind === 'student' && Boolean(data.chat_url) && (
                    <KeyValue label="Чат" value={
                      <a href={String(data.chat_url)} target="_blank" rel="noopener noreferrer">Telegram</a>
                    } />
                  )}
                </div>
                {kind === 'teacher' && Boolean(data.description) && (
                  <p className="optimate-detail-description">{stripHtml(String(data.description))}</p>
                )}
              </DetailSection>

              <DetailSection title="Контакти">
                <ContactsList contacts={contacts} />
              </DetailSection>

              {audience === 'admin' && resolvedEntityId && (
                <DetailSection title="Вхід у LMS">
                  <PortalLoginPasswordPanel kind={kind} optimateId={resolvedEntityId} />
                </DetailSection>
              )}

              <DetailSection title="Продукти та баланси">
                <ProductsTable products={productsSummary} />
              </DetailSection>

              {kind === 'teacher' && (lessonStatsLoading || lessonStats) && (
                <DetailSection title="Статистика уроків">
                  <TeacherLessonStatsPanel
                    stats={lessonStats ?? null}
                    loading={lessonStatsLoading}
                    compact
                  />
                </DetailSection>
              )}

              {kind === 'student' && (
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
              )}

              {audience === 'admin' && kind === 'student' && notes.length > 0 && (
                <DetailSection title="Нотатки">
                  <OptimateNotesList notes={notes} />
                </DetailSection>
              )}

            </>
          )}
        </div>
      </div>
    </div>
  )
}
