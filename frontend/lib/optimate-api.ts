import { apiFetch, withRefreshQuery } from './api-fetch'
import { mapOptimateEventToCalendar } from './calendar-types'
import type { CacheMeta } from './optimate-types'

export type { CacheMeta } from './optimate-types'

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
  cancellation_reason?: string | null
  cancellation_note?: string | null
}

export interface StudentOverview {
  balances: ProductBalance[]
  upcoming_events: StudentEvent[]
  recent_transactions: Transaction[]
  total_lessons_remaining: number
  total_lessons_purchased: number
  total_lessons_used: number
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

const optimateFetch = <T>(path: string, init?: RequestInit) =>
  apiFetch<T>(path, init, { errorMessage: 'Помилка завантаження даних Optimate' })

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
    optimateFetch<StudentOverview>(withRefreshQuery('/api/student/optimate/overview', refresh)),
  balances: (refresh?: boolean) =>
    optimateFetch<BalancesResponse>(withRefreshQuery('/api/student/optimate/balances', refresh)),
  transactions: (page = 1, pageSize = 20, refresh?: boolean) =>
    optimateFetch<PaginatedTransactions>(
      withRefreshQuery(`/api/student/optimate/transactions?page=${page}&page_size=${pageSize}`, refresh),
    ),
  events: (daysBack = 7, daysForward = 30, refresh?: boolean) =>
    optimateFetch<PaginatedEvents>(
      withRefreshQuery(`/api/student/optimate/events?days_back=${daysBack}&days_forward=${daysForward}`, refresh),
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

export function isEventActive(startsAt: string, endsAt: string) {
  const now = Date.now()
  const start = new Date(startsAt).getTime()
  const end = new Date(endsAt).getTime()
  return now >= start && now <= end
}

/** @deprecated Use `mapOptimateEventToCalendar` from `calendar-types`. */
export const optimateEventToCalendarEvent = mapOptimateEventToCalendar
