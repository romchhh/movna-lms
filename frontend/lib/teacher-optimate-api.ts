import { getToken } from './auth'
import type { CacheMeta, PaginatedEvents, StudentEvent } from './optimate-api'

export type { CacheMeta }

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

export interface TeacherStudent {
  id: string
  full_name: string
  status: number
  status_label: string
  email?: string | null
  phone?: string | null
  skill_level_label?: string | null
  remaining_lessons: number
  planned_lessons: number
  completed_lessons: number
  product_names: string[]
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

async function teacherFetch<T>(path: string, init?: RequestInit): Promise<T> {
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
    throw new Error(typeof detail === 'string' ? detail : 'Помилка Optimate')
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

function withRefresh(path: string, refresh?: boolean) {
  if (!refresh) return path
  return `${path}${path.includes('?') ? '&' : '?'}refresh=true`
}

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
      withRefresh(`/api/teacher/optimate/schedules${q}`, refresh),
    )
  },
  events: (daysBack = 7, daysForward = 30, refresh?: boolean) =>
    teacherFetch<PaginatedEvents & { data: TeacherEvent[] }>(
      withRefresh(
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
      withRefresh(`/api/teacher/optimate/students?${q}`, refresh),
    )
  },
  studentDetail: (studentId: string, refresh?: boolean) =>
    teacherFetch<{ data: Record<string, unknown>; cache: CacheMeta }>(
      withRefresh(`/api/teacher/optimate/students/${encodeURIComponent(studentId)}`, refresh),
    ),
  groups: (refresh?: boolean) =>
    teacherFetch<TeacherGroupsResponse>(
      withRefresh('/api/teacher/optimate/groups', refresh),
    ),
  refreshAll: () => teacherFetch<void>('/api/teacher/optimate/refresh', { method: 'POST' }),
}
