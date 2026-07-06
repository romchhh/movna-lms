import { apiFetch, withRefreshQuery } from './api-fetch'
import type { CacheMeta, LessonFormatBreakdown, WeekActivityDay } from './optimate-types'
import type { PaginatedEvents, StudentEvent } from './optimate-api'

export type { CacheMeta, LessonFormatBreakdown }

export type TeacherLessonStatsDayActivity = WeekActivityDay

export interface TeacherLessonStats {
  month_label: string
  stats_year: number
  stats_month: number
  is_current_month: boolean
  days_back: number
  days_forward: number
  completed_in_period: number
  completed_this_month: number
  completed_last_month: number
  completed_this_week: number
  completed_today: number
  planned_this_month: number
  planned_this_week: number
  planned_upcoming: number
  cancelled_this_month: number
  hours_this_month: number
  month_change_pct: number
  week_activity: TeacherLessonStatsDayActivity[]
  unique_students_month: number
  unique_students_speaking_club_month: number
  trial_lessons_month: number
  format_breakdown_month: LessonFormatBreakdown
  busiest_weekday_label: string
  avg_lessons_per_week: number
  total_students: number
  students_speaking_club_only: number
  students_with_regular_lessons: number
  cache: CacheMeta
}

export interface ScheduleSlot {
  start_time: string
  end_time: string
}

export interface ScheduleDay {
  day: number
  day_label: string
  day_short: string
  slots: ScheduleSlot[]
}

export interface TeacherSchedule {
  id: string
  start_date?: string | null
  timezone: string
  days: ScheduleDay[]
}

export interface TeacherSchedulesResponse {
  data: TeacherSchedule[]
  cache: CacheMeta
}

export type TeacherEvent = StudentEvent & { student_names?: string[] }

export interface TeacherStudentProduct {
  product_id: string
  product_name: string
  product_type?: number | null
  lessons_remaining: number
  lessons_total: number
  lessons_used: number
}

export interface TeacherStudent {
  id: string
  full_name: string
  status: number
  status_label: string
  email?: string | null
  phone?: string | null
  skill_level_label?: string | null
  remaining_lessons: number
  lessons_total: number
  lessons_used: number
  is_speaking_club_only: boolean
  planned_lessons: number
  completed_lessons: number
  product_names: string[]
  products: TeacherStudentProduct[]
}

export interface TeacherTransaction {
  id: string
  type: number
  type_label: string
  amount: number
  signed_amount: number
  description?: string | null
  transaction_date?: string | null
  created_at?: string | null
  product_id?: string | null
  product_name?: string | null
  product_type?: number | null
  lesson_id?: string | null
  is_trial?: boolean | null
  period_start_date?: string | null
  period_end_date?: string | null
  salary_invoice_id?: string | null
  student_names: string[]
  is_credit: boolean
}

export interface TeacherTransactionsSummary {
  earned_total: number
  payout_total: number
  lesson_accrual_count: number
  payout_count: number
  date_from?: string | null
  date_to?: string | null
}

export interface PaginatedTeacherTransactions {
  data: TeacherTransaction[]
  total: number
  page: number
  page_size: number
  summary: TeacherTransactionsSummary
  cache: CacheMeta
}

export interface LessonCancellationReason {
  code: string
  label: string
}

export interface TeacherEventCreatePayload {
  student_id: string
  product_id?: string
  starts_at: string
  duration?: number
}

export interface TeacherEventCancelPayload {
  reason_code: string
  note?: string
}

export interface PaginatedTeacherStudents {
  data: TeacherStudent[]
  total: number
  page: number
  page_size: number
  cache: CacheMeta
}

export interface TeacherGroupStudent {
  id: string
  full_name: string
  status: number
  status_label: string
  email?: string | null
  phone?: string | null
}

export interface TeacherGroup {
  id: string
  name: string
  status: number
  status_label: string
  duration: number
  max_student_count: number
  student_count: number
  schedule_label: string
  level_label?: string | null
  product_name?: string | null
  product_type?: number | null
  product_type_label: string
  chat_url?: string | null
  start_date?: string | null
  end_date?: string | null
  planned_lessons: number
  completed_lessons: number
  attendance_percentage: number
  students: TeacherGroupStudent[]
}

export interface TeacherGroupsResponse {
  data: TeacherGroup[]
  total: number
  cache: CacheMeta
}

export interface TeacherProfile {
  id: string
  first_name: string
  last_name: string
  full_name: string
  email?: string | null
  phone?: string | null
  description?: string | null
}

export type TeacherProfileUpdate = {
  first_name?: string
  last_name?: string
  description?: string
}

const teacherFetch = <T>(path: string, init?: RequestInit) =>
  apiFetch<T>(path, init, { errorMessage: 'Помилка Optimate' })

export const teacherOptimateApi = {
  profile: () => teacherFetch<TeacherProfile>('/api/teacher/optimate/profile'),
  updateProfile: (data: TeacherProfileUpdate) =>
    teacherFetch<TeacherProfile>('/api/teacher/optimate/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  schedules: (date?: string, refresh?: boolean) => {
    const q = date ? `?date=${encodeURIComponent(date)}` : ''
    return teacherFetch<TeacherSchedulesResponse>(
      withRefreshQuery(`/api/teacher/optimate/schedules${q}`, refresh),
    )
  },
  lessonStats: (
    daysBack = 365,
    daysForward = 90,
    refresh?: boolean,
    year?: number,
    month?: number,
  ) => {
    const q = new URLSearchParams({
      days_back: String(daysBack),
      days_forward: String(daysForward),
    })
    if (year != null) q.set('year', String(year))
    if (month != null) q.set('month', String(month))
    return teacherFetch<TeacherLessonStats>(
      withRefreshQuery(`/api/teacher/optimate/lesson-stats?${q}`, refresh),
    )
  },
  events: (daysBack = 7, daysForward = 30, refresh?: boolean) =>
    teacherFetch<PaginatedEvents & { data: TeacherEvent[] }>(
      withRefreshQuery(
        `/api/teacher/optimate/events?days_back=${daysBack}&days_forward=${daysForward}`,
        refresh,
      ),
    ),
  students: (page = 1, pageSize = 50, search = '', refresh?: boolean) => {
    const q = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
    })
    if (search.trim()) q.set('search', search.trim())
    return teacherFetch<PaginatedTeacherStudents>(
      withRefreshQuery(`/api/teacher/optimate/students?${q}`, refresh),
    )
  },
  studentDetail: (studentId: string, refresh?: boolean) =>
    teacherFetch<{ data: Record<string, unknown>; cache: CacheMeta }>(
      withRefreshQuery(`/api/teacher/optimate/students/${encodeURIComponent(studentId)}`, refresh),
    ),
  groups: (refresh?: boolean) =>
    teacherFetch<TeacherGroupsResponse>(
      withRefreshQuery('/api/teacher/optimate/groups', refresh),
    ),
  refreshAll: () => teacherFetch<void>('/api/teacher/optimate/refresh', { method: 'POST' }),
  transactions: (
    page = 1,
    pageSize = 20,
    dateFrom?: string,
    dateTo?: string,
    refresh?: boolean,
  ) => {
    const q = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
    })
    if (dateFrom) q.set('date_from', dateFrom)
    if (dateTo) q.set('date_to', dateTo)
    return teacherFetch<PaginatedTeacherTransactions>(
      withRefreshQuery(`/api/teacher/optimate/transactions?${q}`, refresh),
    )
  },
  cancellationReasons: () =>
    teacherFetch<LessonCancellationReason[]>('/api/teacher/optimate/cancellation-reasons'),
  createEvent: (payload: TeacherEventCreatePayload) =>
    teacherFetch<{ ok: boolean; event_id: string; message: string }>(
      '/api/teacher/optimate/events',
      { method: 'POST', body: JSON.stringify(payload) },
    ),
  cancelEvent: (eventId: string, payload: TeacherEventCancelPayload) =>
    teacherFetch<{ ok: boolean; event_id: string; message: string }>(
      `/api/teacher/optimate/events/${encodeURIComponent(eventId)}/cancel`,
      { method: 'POST', body: JSON.stringify(payload) },
    ),
}
