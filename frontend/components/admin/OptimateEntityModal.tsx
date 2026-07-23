'use client'

import { OptimateStudentProfileSections } from '@/components/admin/OptimateStudentProfileSections'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { CacheMeta, formatCacheAge, formatKyivDateTime } from '@/lib/optimate-api'
import { ProductSummary, stripHtml } from '@/lib/admin-optimate-api'
import { PortalLoginPasswordPanel } from '@/components/admin/PortalLoginPasswordPanel'
import { TeacherLessonStatsPanel } from '@/components/teacher/TeacherLessonStatsPanel'
import { TeacherSalariesPanel } from '@/components/teacher/TeacherSalariesPanel'
import { CloseIcon, IconButton, RefreshIcon } from '@/components/shared/Icons'
import { TeacherAboutBlock, UserAvatar } from '@/components/shared/UserAvatar'
import { useLmsProfile } from '@/hooks/useLmsProfiles'
import type { TeacherLessonStats } from '@/lib/teacher-optimate-api'
import { studentDisplayName, teacherDisplayName } from '@/lib/person-display-name'
import { useEffect, useState } from 'react'

type TeacherAdminTab = 'profile' | 'salary'

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
  extraSections?: React.ReactNode
  profileActions?: React.ReactNode
  profileAddon?: React.ReactNode
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
  extraSections,
  profileActions,
  profileAddon,
}: OptimateEntityModalProps) {
  const resolvedEntityId = entityId ?? (data?.id != null ? String(data.id) : null)
  const { profile: lmsProfile } = useLmsProfile(resolvedEntityId ?? undefined)
  const showTeacherTabs = audience === 'admin' && kind === 'teacher' && Boolean(resolvedEntityId)
  const [teacherTab, setTeacherTab] = useState<TeacherAdminTab>('profile')

  useEffect(() => {
    if (!open) return
    setTeacherTab('profile')
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const displayName = kind === 'student'
    ? studentDisplayName(data, String(title ?? 'Учень'))
    : teacherDisplayName(data, String(title ?? 'Викладач'))
  const headerTitle = kind === 'student' ? 'Учень' : 'Викладач'
  const cacheMeta = audience === 'admin' && cache
    ? `Optimate · ${formatCacheAge(cache.synced_at)}${cache.cached ? ' · кеш' : ' · свіжі дані'}`
    : undefined
  const productsSummary = (data?.products_summary as ProductSummary[] | undefined) ?? []
  const contacts = (data?.contacts as { type: string; value: string }[] | undefined) ?? []
  const stats = (data?.stats as Record<string, unknown> | undefined) ?? {}
  const birthDate = data?.birth_date as { day?: number; month?: number; year?: number } | undefined

  return (
    <div className={`optimate-modal-overlay${overlayClassName ? ` ${overlayClassName}` : ''}`} onClick={onClose}>
      <div className="optimate-modal optimate-modal--entity-unified" onClick={e => e.stopPropagation()}>
        <div className="optimate-modal-entity-hero">
          <div className="optimate-modal-entity-hero-row">
            {(data || loading) && (
              <UserAvatar
                name={displayName}
                optimateId={resolvedEntityId ?? undefined}
                avatarUrl={lmsProfile?.avatar_url}
                size="xl"
                kind={kind === 'teacher' ? 'teacher' : 'student'}
              />
            )}
            <div className="optimate-modal-entity-hero-text">
              <span className="optimate-modal-entity-hero-label">{headerTitle}</span>
              {cacheMeta && (
                <span className="optimate-modal-entity-hero-meta">{cacheMeta}</span>
              )}
              <div className="optimate-modal-entity-hero-name">{displayName}</div>
              {kind === 'teacher' && data && (
                <TeacherAboutBlock
                  optimateId={resolvedEntityId ?? undefined}
                  fallbackAbout={data.description ? stripHtml(String(data.description)) : undefined}
                />
              )}
            </div>
            <div className="optimate-modal-entity-hero-actions">
              {profileActions}
              <IconButton
                label="Оновити"
                onClick={onRefresh}
                loading={loading}
                variant="ghost"
                className="app-modal-icon-btn"
              >
                <RefreshIcon />
              </IconButton>
              <IconButton
                label="Закрити"
                onClick={onClose}
                variant="ghost"
                className="app-modal-icon-btn"
              >
                <CloseIcon />
              </IconButton>
            </div>
          </div>
          {profileAddon}
        </div>

        {showTeacherTabs && (
          <div className="optimate-entity-tabs" role="tablist" aria-label="Розділи викладача">
            <button
              type="button"
              role="tab"
              aria-selected={teacherTab === 'profile'}
              className={`optimate-entity-tab${teacherTab === 'profile' ? ' optimate-entity-tab--active' : ''}`}
              onClick={() => setTeacherTab('profile')}
            >
              Профіль
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={teacherTab === 'salary'}
              className={`optimate-entity-tab${teacherTab === 'salary' ? ' optimate-entity-tab--active' : ''}`}
              onClick={() => setTeacherTab('salary')}
            >
              Зарплата
            </button>
          </div>
        )}

        <div className="optimate-modal-body">
          {teacherTab === 'salary' && showTeacherTabs ? (
            <TeacherSalariesPanel embedded teacherId={resolvedEntityId!} />
          ) : (
            <>
          {loading && !data && <p>Завантаження деталей...</p>}
          {error && <div className="alert">{error}</div>}

          {data && (
            <>
              {kind === 'student' ? (
                <OptimateStudentProfileSections
                  data={data}
                  entityId={resolvedEntityId!}
                  audience={audience}
                  onTeacherClick={onTeacherClick}
                  showNotes={audience === 'admin'}
                />
              ) : (
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
                      <KeyValue label="Учнів" value={String(data.students_count ?? stats.studentsCount ?? '—')} />
                      <KeyValue label="Неперевірених уроків" value={String(data.unmarked_lesson_count ?? stats.unmarkedLessonCount ?? '—')} />
                      <KeyValue label="Доступ" value={String(data.auth_status_label ?? '—')} />
                  {birthDate && (
                    <KeyValue
                      label="Дата народження"
                      value={`${birthDate.day ?? '?'}.${birthDate.month ?? '?'}.${birthDate.year ?? '?'}`}
                    />
                  )}
                </div>
                {Boolean(data.description) && !lmsProfile?.about_me && (
                  <p className="optimate-detail-description">{stripHtml(String(data.description))}</p>
                )}
              </DetailSection>

              <DetailSection title="Контакти">
                <ContactsList contacts={contacts} />
              </DetailSection>

              {audience === 'admin' && resolvedEntityId && (
                <DetailSection title="Вхід у LMS">
                  <KeyValue
                    label="Останній вхід (Київ)"
                    value={formatKyivDateTime(data.last_login_at as string | null | undefined)}
                  />
                  <PortalLoginPasswordPanel kind={kind} optimateId={resolvedEntityId} />
                </DetailSection>
              )}

              <DetailSection title="Продукти та баланси">
                <ProductsTable products={productsSummary} />
              </DetailSection>

              {(lessonStatsLoading || lessonStats) && (
                <DetailSection title="Статистика уроків">
                  <TeacherLessonStatsPanel
                    stats={lessonStats ?? null}
                    loading={lessonStatsLoading}
                    compact
                  />
                </DetailSection>
              )}
                </>
              )}

              {extraSections}

            </>
          )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
