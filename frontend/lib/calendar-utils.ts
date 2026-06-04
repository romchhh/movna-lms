const UK_DAY_SHORT = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
const UK_DAY_LONG = ['Неділя', 'Понеділок', 'Вівторок', 'Середа', 'Четвер', "П'ятниця", 'Субота']
const UK_MONTH = [
  'січня', 'лютого', 'березня', 'квітня', 'травня', 'червня',
  'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня',
]

export function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export function addWeeks(d: Date, n: number): Date {
  return addDays(d, n * 7)
}

export function addMonths(d: Date, n: number): Date {
  const x = new Date(d)
  x.setMonth(x.getMonth() + n)
  return x
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function toDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Локальна дата події (не UTC-префікс з ISO). */
export function eventDateKey(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10)
  return toDateKey(d)
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Monday as first day of week */
export function startOfWeek(d: Date): Date {
  const x = startOfDay(d)
  const day = x.getDay()
  const diff = day === 0 ? -6 : 1 - day
  return addDays(x, diff)
}

export function getWeekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

export interface MonthCell {
  date: Date
  inMonth: boolean
  key: string
}

export function getMonthGrid(anchor: Date): MonthCell[][] {
  const year = anchor.getFullYear()
  const month = anchor.getMonth()
  const first = new Date(year, month, 1)
  const gridStart = startOfWeek(first)
  const weeks: MonthCell[][] = []

  let cursor = gridStart
  for (let w = 0; w < 6; w++) {
    const row: MonthCell[] = []
    for (let d = 0; d < 7; d++) {
      row.push({
        date: new Date(cursor),
        inMonth: cursor.getMonth() === month,
        key: toDateKey(cursor),
      })
      cursor = addDays(cursor, 1)
    }
    weeks.push(row)
    if (w >= 4 && cursor.getMonth() !== month && cursor.getDate() > 7) break
  }
  return weeks
}

export function formatDayShort(d: Date): string {
  return UK_DAY_SHORT[d.getDay()]
}

export function formatDayLong(d: Date): string {
  return UK_DAY_LONG[d.getDay()]
}

export function formatMonthYear(d: Date): string {
  const month = new Intl.DateTimeFormat('uk-UA', { month: 'long' }).format(d)
  return `${month.charAt(0).toUpperCase() + month.slice(1)} ${d.getFullYear()}`
}

export function formatDayTitle(d: Date): string {
  return `${d.getDate()} ${UK_MONTH[d.getMonth()]}`
}

export function formatTime(d: Date): string {
  return new Intl.DateTimeFormat('uk-UA', { hour: '2-digit', minute: '2-digit' }).format(d)
}

export function formatEventDateFull(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return `${formatDayLong(d)}, ${formatDayTitle(d)}`
}

export function formatDurationMinutes(minutes?: number): string {
  if (!minutes || minutes <= 0) return '—'
  if (minutes < 60) return `${minutes} хв`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h} год ${m} хв` : `${h} год`
}

export function formatTimeRange(startIso: string, endIso: string): string {
  const start = new Date(startIso)
  const end = new Date(endIso)
  if (Number.isNaN(start.getTime())) return '—'
  if (Number.isNaN(end.getTime())) return formatTime(start)
  return `${formatTime(start)}–${formatTime(end)}`
}

export function groupEventsByDateKey<T extends { starts_at: string }>(
  events: T[],
): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const event of events) {
    const key = eventDateKey(event.starts_at)
    const list = map.get(key) ?? []
    list.push(event)
    map.set(key, list)
  }
  for (const [, list] of map) {
    list.sort((a, b) => a.starts_at.localeCompare(b.starts_at))
  }
  return map
}

export const CALENDAR_HOUR_START = 7
export const CALENDAR_HOUR_END = 23
export const CALENDAR_HOUR_HEIGHT = 48

export function eventPositionPercent(startIso: string, endIso: string): { top: number; height: number } {
  const start = new Date(startIso)
  const end = new Date(endIso)
  if (Number.isNaN(start.getTime())) return { top: 0, height: 5 }

  const dayStart = startOfDay(start)
  dayStart.setHours(CALENDAR_HOUR_START, 0, 0, 0)
  const totalMinutes = (CALENDAR_HOUR_END - CALENDAR_HOUR_START) * 60

  let startMin = (start.getTime() - dayStart.getTime()) / 60000
  let endMin = Number.isNaN(end.getTime())
    ? startMin + 60
    : (end.getTime() - dayStart.getTime()) / 60000

  if (endMin <= startMin) endMin = startMin + 45

  // Повністю поза видимим діапазоном — показуємо маркер у межах колонки
  if (endMin <= 0) return { top: 1, height: 5 }
  if (startMin >= totalMinutes) return { top: 93, height: 6 }

  startMin = Math.max(0, startMin)
  endMin = Math.min(totalMinutes, Math.max(endMin, startMin + 15))

  const durationMin = Math.max(endMin - startMin, 18)
  let top = (startMin / totalMinutes) * 100
  let height = (durationMin / totalMinutes) * 100
  if (top + height > 100) height = Math.max(100 - top, 4)

  return { top, height: Math.max(height, 4) }
}

export function getHourLabels(): number[] {
  const hours: number[] = []
  for (let h = CALENDAR_HOUR_START; h <= CALENDAR_HOUR_END; h++) {
    hours.push(h)
  }
  return hours
}
