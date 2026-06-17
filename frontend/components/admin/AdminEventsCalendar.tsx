'use client'

import { AdminOptimateSyncBar } from '@/components/admin/AdminOptimateSyncBar'
import { EventsCalendar } from '@/components/calendar/EventsCalendar'
import { FilterChipBar } from '@/components/shared/FilterChipBar'
import { Card } from '@/components/shared/UI'
import { AdminEvent, adminEventToCalendarEvent, adminOptimateApi } from '@/lib/admin-optimate-api'
import type { CacheMeta } from '@/lib/optimate-api'
import { useCallback, useEffect, useMemo, useState } from 'react'

type RangeFilter = 'today' | 'fortnight' | 'month'
type StatusFilter = 'all' | 'planned' | 'completed' | 'cancelled'

const RANGE_CHIPS: { key: RangeFilter; label: string; emoji: string }[] = [
  { key: 'today', label: 'Сьогодні', emoji: '📅' },
  { key: 'fortnight', label: '2 тижні', emoji: '📆' },
  { key: 'month', label: 'Місяць', emoji: '🗓️' },
]

const STATUS_CHIPS: { key: StatusFilter; label: string; emoji: string; accent: 'gray' | 'purple' | 'green' | 'red' }[] = [
  { key: 'all', label: 'Всі', emoji: '📋', accent: 'gray' },
  { key: 'planned', label: 'Заплановані', emoji: '📅', accent: 'purple' },
  { key: 'completed', label: 'Проведені', emoji: '✅', accent: 'green' },
  { key: 'cancelled', label: 'Скасовані', emoji: '❌', accent: 'red' },
]

const RANGE_PARAMS: Record<RangeFilter, { back: number; forward: number; label: string }> = {
  today: { back: 0, forward: 1, label: 'Сьогодні' },
  fortnight: { back: 1, forward: 14, label: '2 тижні' },
  month: { back: 7, forward: 45, label: 'Місяць' },
}

const STATUS_API: Record<Exclude<StatusFilter, 'all'>, string> = {
  planned: '3',
  completed: '1',
  cancelled: '2',
}

interface AdminEventsCalendarProps {
  embed?: boolean
  title?: string
  showRangeFilters?: boolean
  showStatusFilters?: boolean
  showSyncBar?: boolean
  defaultRange?: RangeFilter
  defaultView?: 'week' | 'month' | 'agenda'
  showFormatLegend?: boolean
}

export function AdminEventsCalendar({
  embed = false,
  title,
  showRangeFilters = true,
  showStatusFilters = false,
  showSyncBar = true,
  defaultRange = 'fortnight',
  defaultView = 'week',
  showFormatLegend,
}: AdminEventsCalendarProps) {
  const [events, setEvents] = useState<AdminEvent[]>([])
  const [total, setTotal] = useState(0)
  const [cache, setCache] = useState<CacheMeta | null>(null)
  const [range, setRange] = useState<RangeFilter>(defaultRange)
  const [status, setStatus] = useState<StatusFilter>('all')
  const [teacherId, setTeacherId] = useState('')
  const [studentId, setStudentId] = useState('')
  const [teachers, setTeachers] = useState<{ id: string; name: string }[]>([])
  const [students, setStudents] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [tRes, sRes] = await Promise.all([
          adminOptimateApi.teachers(1, 200),
          adminOptimateApi.students(1, 200),
        ])
        if (cancelled) return
        setTeachers(
          tRes.data
            .map(t => ({ id: t.id, name: t.full_name }))
            .sort((a, b) => a.name.localeCompare(b.name, 'uk')),
        )
        setStudents(
          sRes.data
            .map(s => ({ id: s.id, name: s.full_name }))
            .sort((a, b) => a.name.localeCompare(b.name, 'uk')),
        )
      } catch {
        /* фільтри опційні */
      }
    })()
    return () => { cancelled = true }
  }, [])

  const load = useCallback(async (refresh = false) => {
    setLoading(true)
    setError('')
    try {
      const params = RANGE_PARAMS[range]
      const completionStatus = status === 'all' ? '' : STATUS_API[status]
      const res = await adminOptimateApi.eventsAll(
        params.back,
        params.forward,
        completionStatus,
        refresh,
        teacherId,
        studentId,
      )
      setEvents(res.data)
      setTotal(res.total)
      setCache(res.cache)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка')
    } finally {
      setLoading(false)
    }
  }, [range, status, teacherId, studentId])

  useEffect(() => {
    load()
  }, [load])

  const calendarEvents = useMemo(() => events.map(adminEventToCalendarEvent), [events])

  const filters = (
    <div className="admin-cal-filters">
      {showSyncBar && (
        <AdminOptimateSyncBar
          cache={cache}
          onRefreshed={() => load(true)}
          placement="inline"
        />
      )}
      {showRangeFilters && (
        <div className="admin-cal-filter-row admin-cal-filter-row--range">
          <span className="admin-cal-filter-label">Період</span>
          <div className="admin-cal-filter-chips">
            <FilterChipBar
              value={range}
              onChange={setRange}
              accent="red"
              chips={RANGE_CHIPS}
            />
          </div>
        </div>
      )}

      {showStatusFilters && (
        <div className="admin-cal-filter-row admin-cal-filter-row--status">
          <span className="admin-cal-filter-label">Статус</span>
          <div className="admin-cal-filter-chips admin-cal-filter-chips--scroll">
            <FilterChipBar
              value={status}
              onChange={setStatus}
              chips={STATUS_CHIPS}
            />
          </div>
        </div>
      )}

      <div className="admin-cal-filter-row admin-cal-filter-row--selects">
        <label className="admin-cal-select-wrap">
          <span className="admin-cal-select-label">Викладач</span>
          <select
            className="admin-cal-select"
            value={teacherId}
            onChange={e => setTeacherId(e.target.value)}
          >
            <option value="">Усі викладачі</option>
            {teachers.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </label>

        <label className="admin-cal-select-wrap">
          <span className="admin-cal-select-label">Учень</span>
          <select
            className="admin-cal-select"
            value={studentId}
            onChange={e => setStudentId(e.target.value)}
          >
            <option value="">Усі учні</option>
            {students.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </label>
      </div>

      {!loading && total > events.length && (
        <p className="admin-cal-hint">
          Показано {events.length} з {total}
        </p>
      )}
    </div>
  )

  const calendar = (
    <EventsCalendar
      events={calendarEvents}
      loading={loading}
      emptyLabel="Подій не знайдено"
      defaultView={defaultView}
      accent="admin"
      embed={embed}
      entityLinks="admin"
      showParticipants
      showFormatLegend={showFormatLegend ?? !embed}
    />
  )

  if (embed) {
    return (
      <>
        {error && <div className="alert">{error}</div>}
        {filters}
        {calendar}
      </>
    )
  }

  return (
    <>
      {error && <div className="alert">{error}</div>}
      {filters}
      <Card title={title}>
        {calendar}
      </Card>
    </>
  )
}
