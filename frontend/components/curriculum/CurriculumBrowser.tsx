'use client'

import { CurriculumProgramDetail } from '@/components/curriculum/CurriculumProgramDetail'
import { Empty, PageHeader } from '@/components/shared/UI'
import {
  curriculumApi,
  type CurriculumAudience,
  type CurriculumProgram,
} from '@/lib/curriculum-api'
import { useCallback, useEffect, useMemo, useState } from 'react'

function formatSyncedAt(ts: number | null | undefined): string {
  if (!ts) return '—'
  return new Date(ts * 1000).toLocaleString('uk-UA', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface CurriculumBrowserProps {
  audience: CurriculumAudience
  canRefresh?: boolean
  onCustomizeMovna?: (slug: string) => void
  customizingSlug?: string | null
}

export function CurriculumBrowser({
  audience,
  canRefresh = false,
  onCustomizeMovna,
  customizingSlug = null,
}: CurriculumBrowserProps) {
  const [programs, setPrograms] = useState<CurriculumProgram[]>([])
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [cachedAt, setCachedAt] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const accentClass = audience === 'admin' ? 'curr-hub--admin' : 'curr-hub--teacher'

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true)
    else setLoading(true)
    setError('')
    try {
      const res = refresh && canRefresh
        ? await curriculumApi.refresh()
        : await curriculumApi.list(audience)
      setPrograms(res.programs)
      setCachedAt(res.cached_at)
      setSelectedSlug(prev => {
        if (prev && res.programs.some(p => p.slug === prev)) return prev
        return res.programs[0]?.slug ?? null
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка завантаження')
      setPrograms([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [audience, canRefresh])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return programs
    return programs.filter(p => p.name.toLowerCase().includes(q))
  }, [programs, query])

  const selected = useMemo(
    () => programs.find(p => p.slug === selectedSlug) ?? null,
    [programs, selectedSlug],
  )

  const sub = loading
    ? 'Завантаження з Google Sheets…'
    : `${programs.length} програм · оновлено ${formatSyncedAt(cachedAt)}`

  return (
    <div className={`curr-hub ${accentClass}`}>
      <PageHeader title="Навчальні програми" sub={sub}>
        {canRefresh && (
          <button
            type="button"
            className={`btn btn-sm ${audience === 'admin' ? 'btn-danger' : 'btn-teal'}`}
            onClick={() => load(true)}
            disabled={loading || refreshing}
          >
            {refreshing ? 'Оновлення…' : '⟳ Оновити'}
          </button>
        )}
      </PageHeader>

      {error && <div className="alert">{error}</div>}

      {loading && <Empty label="Завантаження програм…" />}
      {!loading && programs.length === 0 && !error && (
        <Empty label="Програми не знайдено" />
      )}

      {!loading && programs.length > 0 && (
        <div className="curr-layout">
          <aside className="curr-sidebar">
            <input
              className="input curr-search"
              placeholder="Пошук програми…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            <p className="curr-sidebar-label">
              {filtered.length} з {programs.length}
            </p>
            <div className="curr-program-list">
              {filtered.map(program => (
                <button
                  key={program.slug}
                  type="button"
                  className={`curr-program-pick${selectedSlug === program.slug ? ' curr-program-pick--active' : ''}`}
                  onClick={() => setSelectedSlug(program.slug)}
                >
                  <span className="curr-program-pick-title">{program.name}</span>
                  <span className="curr-program-pick-meta">
                    <span>{program.module_count} модулів</span>
                    <span>{program.lesson_count} уроків</span>
                  </span>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="curr-sidebar-empty">Нічого не знайдено</p>
              )}
            </div>
          </aside>

          <main className="curr-main">
            {selected ? (
              <CurriculumProgramDetail
                program={selected}
                onCustomize={
                  onCustomizeMovna && audience === 'teacher'
                    ? () => onCustomizeMovna(selected.slug)
                    : undefined
                }
                customizing={customizingSlug === selected.slug}
              />
            ) : (
              <Empty label="Оберіть програму зі списку" />
            )}
          </main>
        </div>
      )}
    </div>
  )
}
