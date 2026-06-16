'use client'

import { OptimateEntityModal } from '@/components/admin/OptimateEntityModal'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Badge } from '@/components/shared/UI'
import { IconButton, ChevronLeftIcon, ChevronRightIcon } from '@/components/shared/Icons'
import { CalendarFormatLegend } from '@/components/calendar/CalendarFormatLegend'
import { EventDetailModal } from '@/components/calendar/EventDetailModal'
import { EventFormatBadge } from '@/components/calendar/EventFormatBadge'
import {
  calendarEventFormatModifier,
  eventStatusEmoji,
  type CalendarEvent,
  type CalendarParticipant,
  type CalendarViewMode,
} from '@/lib/calendar-types'
import { adminOptimateApi } from '@/lib/admin-optimate-api'
import { teacherOptimateApi } from '@/lib/teacher-optimate-api'
import type { CacheMeta } from '@/lib/optimate-api'
import {
  CALENDAR_HOUR_END,
  CALENDAR_HOUR_HEIGHT,
  CALENDAR_HOUR_START,
  addDays,
  addMonths,
  addWeeks,
  eventDateKey,
  eventPositionPercent,
  formatDayLong,
  formatDayShort,
  formatDayTitle,
  formatMonthYear,
  formatTimeRange,
  getHourLabels,
  getMonthGrid,
  getWeekDays,
  groupEventsByDateKey,
  isSameDay,
  isSameMonth,
  parseDateKey,
  startOfDay,
  toDateKey,
} from '@/lib/calendar-utils'
import { isEventActive } from '@/lib/optimate-api'
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'

interface EventsCalendarProps {
  events: CalendarEvent[]
  loading?: boolean
  emptyLabel?: string
  defaultView?: CalendarViewMode
  accent?: 'default' | 'admin'
  embed?: boolean
  /** Адмін/викладач: клік по учню відкриває профіль Optimate */
  entityLinks?: 'admin' | 'teacher'
  /** Показувати викладача / учня на плитках тижня та місяця */
  showParticipants?: boolean
  /** Учень: кнопки скасування / перенесення уроку */
  enableLessonRequests?: boolean
  enableHomework?: boolean
  enableStudentHomework?: boolean
  onOpenHomework?: (submissionId: number) => void
  /** Легенда: індивідуальний / груповий / … */
  showFormatLegend?: boolean
}

function statusBadge(variant?: CalendarEvent['status_variant']) {
  if (!variant) return 'gray' as const
  return variant
}

function StatusEmoji({ label }: { label?: string }) {
  return (
    <span className="cal-status-emoji" aria-hidden title={label}>
      {eventStatusEmoji(label)}
    </span>
  )
}

function WeekNowLine() {
  const now = new Date()
  const h = now.getHours()
  const m = now.getMinutes()
  if (h < CALENDAR_HOUR_START || h > CALENDAR_HOUR_END) return null
  const totalMinutes = (CALENDAR_HOUR_END - CALENDAR_HOUR_START) * 60
  const offsetMin = (h - CALENDAR_HOUR_START) * 60 + m
  const top = (offsetMin / totalMinutes) * 100
  return (
    <div className="cal-now-line" style={{ top: `${top}%` }}>
      <span className="cal-now-dot" />
    </div>
  )
}

function EventCard({
  event,
  compact = false,
  selected = false,
  onClick,
}: {
  event: CalendarEvent
  compact?: boolean
  selected?: boolean
  onClick?: () => void
}) {
  const active = isEventActive(event.starts_at, event.ends_at)
  const Tag = onClick ? 'button' : 'div'
  const formatMod = calendarEventFormatModifier(event.schedule_class)

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      className={[
        'cal-event-card',
        formatMod,
        compact && 'cal-event-card--compact',
        onClick && 'cal-event-card--clickable',
        selected && 'cal-event-card--selected',
      ].filter(Boolean).join(' ')}
      style={{ '--event-accent': event.accent_color ?? 'var(--p)' } as CSSProperties}
      onClick={onClick}
    >
      <div className="cal-event-card-top">
        <span className="cal-event-card-title">
          <EventFormatBadge scheduleClass={event.schedule_class} compact />
          {event.title}
        </span>
        <span className="cal-event-card-badges">
          {event.schedule_class_label && (
            <span className="cal-event-format-label">{event.schedule_class_label}</span>
          )}
          {event.status_label && (
            <StatusBadge
              label={event.status_label}
              variant={statusBadge(event.status_variant)}
            />
          )}
        </span>
      </div>
      <div className="cal-event-card-time">{formatTimeRange(event.starts_at, event.ends_at)}</div>
      {!compact && event.subtitle && (
        <div className="cal-event-card-sub">{event.subtitle}</div>
      )}
      {event.is_trial && <span className="cal-event-card-trial">Пробний</span>}
      {active && <span className="cal-event-card-live">Зараз</span>}
    </Tag>
  )
}

function CalendarToolbar({
  view,
  onViewChange,
  label,
  onPrev,
  onNext,
  onToday,
  accent,
}: {
  view: CalendarViewMode
  onViewChange: (v: CalendarViewMode) => void
  label: string
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  accent: 'default' | 'admin'
}) {
  const accentClass = accent === 'admin' ? 'cal-toolbar--admin' : ''

  return (
    <div className={`cal-toolbar ${accentClass}`}>
      <div className="cal-toolbar-period">
        <div className="cal-toolbar-period-nav">
          <IconButton label="Попередній період" size="sm" onClick={onPrev}>
            <ChevronLeftIcon />
          </IconButton>
          <h3 className="cal-toolbar-label">{label}</h3>
          <IconButton label="Наступний період" size="sm" onClick={onNext}>
            <ChevronRightIcon />
          </IconButton>
        </div>
        <button type="button" className="cal-today-btn" onClick={onToday}>
          Сьогодні
        </button>
      </div>
      <div className="cal-segmented">
        {(['week', 'month', 'agenda'] as const).map(v => (
          <button
            key={v}
            type="button"
            className={`cal-segment${view === v ? ' cal-segment--active' : ''}`}
            onClick={() => onViewChange(v)}
          >
            {{ week: 'Тиждень', month: 'Місяць', agenda: 'Список' }[v]}
          </button>
        ))}
      </div>
    </div>
  )
}

function WeekView({
  anchor,
  events,
  selectedKey,
  activeEventId,
  onSelectDay,
  onSelectEvent,
  showParticipants,
}: {
  anchor: Date
  events: CalendarEvent[]
  selectedKey: string
  activeEventId: string | null
  onSelectDay: (key: string) => void
  onSelectEvent: (event: CalendarEvent) => void
  showParticipants?: boolean
}) {
  const today = startOfDay(new Date())
  const days = getWeekDays(anchor)
  const byDay = useMemo(() => groupEventsByDateKey(events), [events])
  const hours = getHourLabels()
  const gridHeight = (CALENDAR_HOUR_END - CALENDAR_HOUR_START) * CALENDAR_HOUR_HEIGHT
  const showNow = days.some(d => isSameDay(d, today))

  return (
    <div className="cal-week">
      <div className="cal-week-scroll">
        <div className="cal-week-track">
          <div className="cal-week-header">
            <div className="cal-week-gutter" aria-hidden />
            {days.map(day => {
              const key = toDateKey(day)
              const isToday = isSameDay(day, today)
              const isSelected = key === selectedKey
              const dayEvents = byDay.get(key) ?? []
              return (
                <button
                  key={key}
                  type="button"
                  className={[
                    'cal-week-day-head',
                    isToday && 'cal-week-day-head--today',
                    isSelected && 'cal-week-day-head--selected',
                  ].filter(Boolean).join(' ')}
                  onClick={() => onSelectDay(key)}
                >
                  <span className="cal-week-day-name">{formatDayShort(day)}</span>
                  <span className="cal-week-day-num">{day.getDate()}</span>
                  {dayEvents.length > 0 && (
                    <span className="cal-week-day-count">{dayEvents.length}</span>
                  )}
                </button>
              )
            })}
          </div>

          <div className="cal-week-body" style={{ height: gridHeight }}>
            <div className="cal-week-times">
              {hours.map(h => (
                <div key={h} className="cal-week-time" style={{ height: CALENDAR_HOUR_HEIGHT }}>
                  {String(h).padStart(2, '0')}:00
                </div>
              ))}
            </div>
            <div className="cal-week-days">
              {hours.map(h => (
                <div
                  key={`line-${h}`}
                  className="cal-week-grid-line"
                  style={{ top: (h - CALENDAR_HOUR_START) * CALENDAR_HOUR_HEIGHT }}
                />
              ))}
              {showNow && <WeekNowLine />}
              {days.map(day => {
                const key = toDateKey(day)
                const isToday = isSameDay(day, today)
                const dayEvents = byDay.get(key) ?? []
                return (
                  <div
                    key={key}
                    className={`cal-week-col${isToday ? ' cal-week-col--today' : ''}`}
                  >
                    {dayEvents.map(event => {
                      const { top, height } = eventPositionPercent(event.starts_at, event.ends_at)
                      const isActive = activeEventId === event.id
                      const formatMod = calendarEventFormatModifier(event.schedule_class)
                      return (
                        <button
                          key={event.id}
                          type="button"
                          className={[
                            'cal-week-event',
                            formatMod,
                            isActive && 'cal-week-event--active',
                          ].filter(Boolean).join(' ')}
                          style={{
                            top: `${top}%`,
                            height: `${Math.max(height, 4)}%`,
                            '--event-accent': event.accent_color ?? 'var(--p)',
                          } as CSSProperties}
                          onClick={() => onSelectEvent(event)}
                        >
                          <span className="cal-week-event-title">
                            <StatusEmoji label={event.status_label} />
                            <EventFormatBadge scheduleClass={event.schedule_class} compact />
                            {event.title}
                          </span>
                          {showParticipants && event.subtitle && (
                            <span className="cal-week-event-meta">{event.subtitle}</span>
                          )}
                          <span className="cal-week-event-time">
                            {formatTimeRange(event.starts_at, event.ends_at)}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MonthView({
  anchor,
  events,
  selectedKey,
  onSelectDay,
  onSelectEvent,
  showParticipants,
}: {
  anchor: Date
  events: CalendarEvent[]
  selectedKey: string
  onSelectDay: (key: string) => void
  onSelectEvent: (event: CalendarEvent) => void
  showParticipants?: boolean
}) {
  const today = startOfDay(new Date())
  const weeks = getMonthGrid(anchor)
  const byDay = useMemo(() => groupEventsByDateKey(events), [events])

  return (
    <div className="cal-month">
      <div className="cal-month-scroll">
        <div className="cal-month-inner">
          <div className="cal-month-weekdays">
            {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'].map(d => (
              <div key={d} className="cal-month-weekday">{d}</div>
            ))}
          </div>
          {weeks.map((week, wi) => (
            <div key={wi} className="cal-month-row">
              {week.map(cell => {
                const dayEvents = byDay.get(cell.key) ?? []
                const isToday = isSameDay(cell.date, today)
                const isSelected = cell.key === selectedKey
                return (
                  <div
                    key={cell.key}
                    className={[
                      'cal-month-cell',
                      !cell.inMonth && 'cal-month-cell--muted',
                      isToday && 'cal-month-cell--today',
                      isSelected && 'cal-month-cell--selected',
                    ].filter(Boolean).join(' ')}
                  >
                    <button
                      type="button"
                      className="cal-month-cell-head"
                      onClick={() => onSelectDay(cell.key)}
                    >
                      <span className="cal-month-cell-num">{cell.date.getDate()}</span>
                      {dayEvents.length > 0 && (
                        <span className="cal-month-badge">{dayEvents.length}</span>
                      )}
                    </button>
                    <div className="cal-month-cell-events">
                      {dayEvents.slice(0, 3).map(ev => {
                        const formatMod = calendarEventFormatModifier(ev.schedule_class)
                        return (
                        <button
                          key={ev.id}
                          type="button"
                          className={['cal-month-pill', formatMod].filter(Boolean).join(' ')}
                          style={{ '--event-accent': ev.accent_color ?? 'var(--p)' } as CSSProperties}
                          onClick={() => onSelectEvent(ev)}
                        >
                          <span className="cal-month-pill-time">
                            <StatusEmoji label={ev.status_label} />
                            <EventFormatBadge scheduleClass={ev.schedule_class} compact />
                            {formatTimeRange(ev.starts_at, ev.ends_at).split('–')[0]}
                          </span>
                          <span className="cal-month-pill-title">{ev.title}</span>
                          {showParticipants && ev.subtitle && (
                            <span className="cal-month-pill-sub">{ev.subtitle}</span>
                          )}
                        </button>
                        )
                      })}
                      {dayEvents.length > 3 && (
                        <button
                          type="button"
                          className="cal-month-more"
                          onClick={() => onSelectDay(cell.key)}
                        >
                          ще {dayEvents.length - 3}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function AgendaView({
  events,
  anchor,
  embed,
  activeEventId,
  onSelectEvent,
}: {
  events: CalendarEvent[]
  anchor: Date
  embed?: boolean
  activeEventId: string | null
  onSelectEvent: (event: CalendarEvent) => void
}) {
  const filtered = useMemo(() => {
    if (embed) return events
    return events.filter(e => isSameMonth(new Date(e.starts_at), anchor))
  }, [events, anchor, embed])

  const sorted = [...filtered].sort((a, b) => a.starts_at.localeCompare(b.starts_at))
  const grouped = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const e of sorted) {
      const k = eventDateKey(e.starts_at)
      const list = map.get(k) ?? []
      list.push(e)
      map.set(k, list)
    }
    return [...map.entries()]
  }, [sorted])

  if (grouped.length === 0) {
    return (
      <p className="cal-empty-inline">
        {embed ? 'Майбутніх уроків немає' : 'Немає подій для обраного періоду'}
      </p>
    )
  }

  return (
    <div className="cal-agenda">
      {grouped.map(([dayKey, dayEvents]) => (
        <section key={dayKey} className="cal-agenda-day">
          <h4 className="cal-agenda-day-title">
            {formatDayLong(parseDateKey(dayKey))}, {formatDayTitle(parseDateKey(dayKey))}
          </h4>
          <div className="cal-agenda-list">
            {dayEvents.map(ev => (
              <EventCard
                key={ev.id}
                event={ev}
                selected={activeEventId === ev.id}
                onClick={() => onSelectEvent(ev)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

export function EventsCalendar({
  events,
  loading = false,
  emptyLabel = 'Подій не знайдено',
  defaultView = 'week',
  accent = 'default',
  embed = false,
  entityLinks,
  showParticipants = false,
  enableLessonRequests = false,
  enableHomework = false,
  enableStudentHomework = false,
  onOpenHomework,
  showFormatLegend = !embed,
}: EventsCalendarProps) {
  const today = startOfDay(new Date())
  const [view, setView] = useState<CalendarViewMode>(defaultView)
  const [anchor, setAnchor] = useState(today)
  const [selectedKey, setSelectedKey] = useState(toDateKey(today))
  const [detailEvent, setDetailEvent] = useState<CalendarEvent | null>(null)

  const [entityKind, setEntityKind] = useState<'student' | 'teacher' | null>(null)
  const [entityId, setEntityId] = useState<string | null>(null)
  const [entityTitle, setEntityTitle] = useState('')
  const [entityDetail, setEntityDetail] = useState<Record<string, unknown> | null>(null)
  const [entityCache, setEntityCache] = useState<CacheMeta | null>(null)
  const [entityLoading, setEntityLoading] = useState(false)
  const [entityError, setEntityError] = useState('')

  const loadEntity = useCallback(async (kind: 'student' | 'teacher', id: string, refresh = false) => {
    setEntityLoading(true)
    setEntityError('')
    try {
      const res = kind === 'student'
        ? (entityLinks === 'teacher'
          ? await teacherOptimateApi.studentDetail(id, refresh)
          : await adminOptimateApi.studentDetail(id, refresh))
        : await adminOptimateApi.teacherDetail(id, refresh)
      setEntityDetail(res.data)
      setEntityCache(res.cache)
      const name = String(res.data.full_name ?? res.data.name ?? '')
      if (name) setEntityTitle(name)
    } catch (err) {
      setEntityError(err instanceof Error ? err.message : 'Помилка')
    } finally {
      setEntityLoading(false)
    }
  }, [entityLinks])

  useEffect(() => {
    if (!entityLinks || !entityId || !entityKind) return
    loadEntity(entityKind, entityId)
  }, [entityLinks, entityId, entityKind, loadEntity])

  function openParticipant(participant: CalendarParticipant) {
    if (!entityLinks || !participant.id) return
    if (entityLinks === 'teacher' && participant.kind !== 'student') return
    setEntityKind(participant.kind)
    setEntityId(participant.id)
    setEntityTitle(participant.name)
    setEntityDetail(null)
    setEntityCache(null)
    setEntityError('')
  }

  function closeEntity() {
    setEntityKind(null)
    setEntityId(null)
    setEntityTitle('')
    setEntityDetail(null)
    setEntityCache(null)
    setEntityError('')
  }

  useEffect(() => {
    setView(defaultView)
  }, [defaultView])

  const toolbarLabel = useMemo(() => {
    if (view === 'month') return formatMonthYear(anchor)
    if (view === 'week') {
      const days = getWeekDays(anchor)
      const start = days[0]
      const end = days[6]
      if (start.getMonth() === end.getMonth()) {
        return `${start.getDate()}–${end.getDate()} ${formatMonthYear(start)}`
      }
      return `${start.getDate()} ${formatMonthYear(start).split(' ')[0]} – ${end.getDate()} ${formatMonthYear(end)}`
    }
    return formatMonthYear(anchor)
  }, [view, anchor])

  function goPrev() {
    if (view === 'week') setAnchor(a => addWeeks(a, -1))
    else setAnchor(a => addMonths(a, -1))
  }

  function goNext() {
    if (view === 'week') setAnchor(a => addWeeks(a, 1))
    else setAnchor(a => addMonths(a, 1))
  }

  function goToday() {
    const t = startOfDay(new Date())
    setAnchor(t)
    setSelectedKey(toDateKey(t))
  }

  function handleViewChange(next: CalendarViewMode) {
    if (next === 'week' && selectedKey) {
      setAnchor(parseDateKey(selectedKey))
    }
    setView(next)
  }

  function handleSelectDay(key: string) {
    setSelectedKey(key)
    setAnchor(parseDateKey(key))
  }

  function openEvent(event: CalendarEvent) {
    setDetailEvent(event)
    setSelectedKey(eventDateKey(event.starts_at))
  }

  const selectedEvents = useMemo(() => {
    return events
      .filter(e => eventDateKey(e.starts_at) === selectedKey)
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
  }, [events, selectedKey])

  const activeEventId = detailEvent?.id ?? null

  const root = (
    <>
      <div className="cal-root">
        <CalendarToolbar
          view={view}
          onViewChange={handleViewChange}
          label={toolbarLabel}
          onPrev={goPrev}
          onNext={goNext}
          onToday={goToday}
          accent={accent}
        />

        {showFormatLegend && !loading && events.length > 0 && <CalendarFormatLegend />}

        {loading && (
          <div className="cal-loading">
            <span className="cal-loading-spinner" />
            Завантаження календаря...
          </div>
        )}

        {!loading && events.length === 0 && (
          <div className="cal-empty">{emptyLabel}</div>
        )}

        {!loading && events.length > 0 && (
          <>
            {view === 'week' && (
              <WeekView
                anchor={anchor}
                events={events}
                selectedKey={selectedKey}
                activeEventId={activeEventId}
                onSelectDay={handleSelectDay}
                onSelectEvent={openEvent}
                showParticipants={showParticipants}
              />
            )}
            {view === 'month' && (
              <MonthView
                anchor={anchor}
                events={events}
                selectedKey={selectedKey}
                onSelectDay={handleSelectDay}
                onSelectEvent={openEvent}
                showParticipants={showParticipants}
              />
            )}
            {view === 'agenda' && (
              <AgendaView
                events={events}
                anchor={anchor}
                embed={embed}
                activeEventId={activeEventId}
                onSelectEvent={openEvent}
              />
            )}

            {!embed && (
              <aside className="cal-sidebar">
                <div className="cal-sidebar-head">
                  <h4>
                    {formatDayLong(parseDateKey(selectedKey))}
                    <span>{formatDayTitle(parseDateKey(selectedKey))}</span>
                  </h4>
                  <span className="cal-sidebar-count">{selectedEvents.length} подій</span>
                </div>
                <div className="cal-sidebar-list">
                  {selectedEvents.length === 0 && (
                    <p className="cal-empty-inline">На цей день подій немає</p>
                  )}
                  {selectedEvents.map(ev => (
                    <EventCard
                      key={ev.id}
                      event={ev}
                      compact
                      selected={activeEventId === ev.id}
                      onClick={() => openEvent(ev)}
                    />
                  ))}
                </div>
              </aside>
            )}
          </>
        )}
      </div>

      <EventDetailModal
        event={detailEvent}
        onClose={() => {
          if (entityId) {
            closeEntity()
            return
          }
          setDetailEvent(null)
        }}
        onParticipantClick={entityLinks ? openParticipant : undefined}
        allowEscape={!entityId}
        enableLessonRequests={enableLessonRequests}
        enableHomework={enableHomework}
        enableStudentHomework={enableStudentHomework}
        onOpenHomework={onOpenHomework}
      />

      {entityLinks && (
        <OptimateEntityModal
          open={!!entityId && !!entityKind}
          title={entityTitle || (entityKind === 'teacher' ? 'Викладач' : 'Учень')}
          entityId={entityId}
          loading={entityLoading}
          error={entityError}
          data={entityDetail}
          cache={entityCache}
          onClose={closeEntity}
          onRefresh={() => entityId && entityKind && loadEntity(entityKind, entityId, true)}
          kind={entityKind ?? 'student'}
          audience={entityLinks === 'teacher' ? 'teacher' : 'admin'}
          overlayClassName="optimate-modal-overlay--above-cal"
        />
      )}
    </>
  )

  if (embed) {
    return <div className="cal-embed">{root}</div>
  }
  return root
}
