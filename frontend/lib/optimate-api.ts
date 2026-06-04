import { getToken } from './auth'

export interface CacheMeta {
  cached: boolean
  synced_at: string
}

export interface ProductBalance {
  product_id: string
  product_name: string
  product_type: number
  product_type_label: string
  lessons_remaining: number
  lessons_total: number
  lessons_used: number
  price_per_lesson?: number | null
}

export interface Transaction {
  id: string
  type: number
  type_label: string
  amount: number
  lesson_count: number
  description?: string | null
  transaction_date?: string | null
  created_at?: string | null
  product_id?: string | null
  product_name?: string | null
  product_type?: number | null
  is_credit: boolean
}

export interface StudentEvent {
  id: string
  event_type: number
  starts_at: string
  ends_at: string
  duration: number
  product_id?: string | null
  product_name?: string | null
  product_type?: number | null
  product_type_label?: string | null
  teacher_name?: string | null
  is_trial: boolean
  is_completed?: boolean | null
  completion_label: string
  schedule_class: string
  student_names?: string[]
  student_ids?: string[]
  teacher_names?: string[]
  teacher_ids?: string[]
}

export interface StudentOverview {
  balances: ProductBalance[]
  upcoming_events: StudentEvent[]
  recent_transactions: Transaction[]
  total_lessons_remaining: number
  synced_at: string
  cache: CacheMeta
}

export interface BalancesResponse {
  data: ProductBalance[]
  cache: CacheMeta
}

export interface PaginatedTransactions {
  data: Transaction[]
  total: number
  page: number
  page_size: number
  cache: CacheMeta
}

export interface PaginatedEvents {
  data: StudentEvent[]
  total: number
  date_from: string
  date_to: string
  cache: CacheMeta
}

export interface BirthDate {
  day: number
  month: number
  year: number
}

export interface StudentProfile {
  id: string
  first_name: string
  last_name: string
  full_name: string
  email?: string | null
  phone?: string | null
  chat_url?: string | null
  birth_date?: BirthDate | null
}

export type StudentProfileUpdate = {
  first_name?: string
  last_name?: string
  chat_url?: string
  birth_date?: BirthDate | null
}

async function optimateFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken()
  if (!token) throw new Error('Не авторизовано')

  const res = await fetch(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers as Record<string, string> | undefined),
    },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    const detail = err.detail
    throw new Error(typeof detail === 'string' ? detail : 'Помилка завантаження даних Optimate')
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

function withRefresh(path: string, refresh?: boolean) {
  if (!refresh) return path
  const sep = path.includes('?') ? '&' : '?'
  return `${path}${sep}refresh=true`
}

export function profileInitials(firstName: string, lastName: string) {
  const a = (firstName || '').trim().charAt(0)
  const b = (lastName || '').trim().charAt(0)
  return `${a}${b}`.toUpperCase() || '—'
}

export const optimateApi = {
  profile: () => optimateFetch<StudentProfile>('/api/student/optimate/profile'),
  updateProfile: (data: StudentProfileUpdate) =>
    optimateFetch<StudentProfile>('/api/student/optimate/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  overview: (refresh?: boolean) =>
    optimateFetch<StudentOverview>(withRefresh('/api/student/optimate/overview', refresh)),
  balances: (refresh?: boolean) =>
    optimateFetch<BalancesResponse>(withRefresh('/api/student/optimate/balances', refresh)),
  transactions: (page = 1, pageSize = 20, refresh?: boolean) =>
    optimateFetch<PaginatedTransactions>(
      withRefresh(`/api/student/optimate/transactions?page=${page}&page_size=${pageSize}`, refresh),
    ),
  events: (daysBack = 7, daysForward = 30, refresh?: boolean) =>
    optimateFetch<PaginatedEvents>(
      withRefresh(`/api/student/optimate/events?days_back=${daysBack}&days_forward=${daysForward}`, refresh),
    ),
  refreshAll: () =>
    optimateFetch<void>('/api/student/optimate/refresh', { method: 'POST' }),
}

export const PRODUCT_ACCENT: Record<number, { color: string; badge: 'purple' | 'amber' | 'teal' | 'gray' }> = {
  1: { color: 'var(--p)', badge: 'purple' },
  2: { color: 'var(--a)', badge: 'amber' },
  3: { color: 'var(--t)', badge: 'teal' },
  4: { color: 'var(--pd)', badge: 'purple' },
}

export function formatCacheAge(syncedAt: string) {
  const diff = Date.now() - new Date(syncedAt).getTime()
  if (Number.isNaN(diff) || diff < 0) return 'щойно'
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'щойно'
  if (min === 1) return '1 хв тому'
  if (min < 60) return `${min} хв тому`
  const hours = Math.floor(min / 60)
  return hours === 1 ? '1 год тому' : `${hours} год тому`
}

export function formatOptimateDate(iso: string | null | undefined, withTime = false) {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: withTime ? undefined : 'numeric',
    hour: withTime ? '2-digit' : undefined,
    minute: withTime ? '2-digit' : undefined,
  }).format(date)
}

export function formatEventTimeRange(startsAt: string, endsAt: string) {
  const start = new Date(startsAt)
  const end = new Date(endsAt)
  if (Number.isNaN(start.getTime())) return '—'
  const timeFmt = new Intl.DateTimeFormat('uk-UA', { hour: '2-digit', minute: '2-digit' })
  if (Number.isNaN(end.getTime())) return timeFmt.format(start)
  return `${timeFmt.format(start)}–${timeFmt.format(end)}`
}

export function groupEventsByDay(events: StudentEvent[]) {
  const map = new Map<string, StudentEvent[]>()
  for (const event of events) {
    const key = event.starts_at.slice(0, 10)
    const list = map.get(key) ?? []
    list.push(event)
    map.set(key, list)
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
}

export function isEventSoon(startsAt: string, withinMinutes = 15) {
  const start = new Date(startsAt).getTime()
  const now = Date.now()
  const diff = start - now
  return diff >= 0 && diff <= withinMinutes * 60 * 1000
}

export function isEventActive(startsAt: string, endsAt: string) {
  const now = Date.now()
  const start = new Date(startsAt).getTime()
  const end = new Date(endsAt).getTime()
  return now >= start && now <= end
}
