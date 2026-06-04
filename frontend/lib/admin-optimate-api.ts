import { getToken } from './auth'
import type { CacheMeta } from './optimate-api'

export type { CacheMeta }

export interface ProductSummary {
  product_id: string
  product_name: string
  product_type?: number | null
  lessons_remaining: number
  lessons_total: number
  lessons_used: number
}

export interface StudentListItem {
  id: string
  first_name: string
  last_name: string
  full_name: string
  status: number
  status_label: string
  email?: string | null
  phone?: string | null
  contacts: { type: string; value: string }[]
  is_child: boolean
  skill_level?: number | null
  skill_level_label?: string | null
  product_count: number
  remaining_lessons: number
  planned_lessons: number
  completed_lessons: number
  teacher_ids: string[]
  teacher_names: string[]
  products_summary: ProductSummary[]
  chat_url?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export interface TeacherListItem {
  id: string
  first_name: string
  last_name: string
  full_name: string
  status: number
  status_label: string
  email?: string | null
  phone?: string | null
  contacts: { type: string; value: string }[]
  description?: string | null
  photo_path?: string | null
  students_count?: number | null
  product_count: number
  unmarked_lesson_count?: number | null
  products_summary: ProductSummary[]
  created_at?: string | null
  updated_at?: string | null
}

export interface PaginatedStudents {
  data: StudentListItem[]
  total: number
  page: number
  page_size: number
  cache: CacheMeta
}

export interface PaginatedTeachers {
  data: TeacherListItem[]
  total: number
  page: number
  page_size: number
  cache: CacheMeta
}

export type StudentDetail = Record<string, unknown>
export type TeacherDetail = Record<string, unknown>

export interface StudentAccount {
  optimate_id: string
  user_id?: number | null
  email?: string | null
  has_account: boolean
  has_password: boolean
  password?: string | null
  is_active: boolean
}

export interface StudentPasswordResult {
  optimate_id: string
  user_id: number
  email: string
  password: string
  generated: boolean
}

export interface AdminEvent {
  id: string
  event_type: number
  event_type_label: string
  starts_at: string
  ends_at: string
  duration: number
  is_trial: boolean
  is_completed?: boolean | null
  completion_label: string
  product_id?: string | null
  product_name?: string | null
  product_type?: number | null
  product_type_label?: string | null
  student_names: string[]
  student_ids: string[]
  teacher_names: string[]
  teacher_ids: string[]
}

export interface PaginatedEvents {
  data: AdminEvent[]
  total: number
  page: number
  page_size: number
  date_from: string
  date_to: string
  cache: CacheMeta
}

export interface AdminOverview {
  students_total: number
  teachers_total: number
  events_today: number
  events_week: number
  unmarked_lessons: number
  low_balance_students: {
    id: string
    full_name: string
    remaining_lessons: number
    product_count: number
    chat_url?: string | null
  }[]
  teacher_load: {
    id: string
    full_name: string
    students_count?: number | null
    unmarked_lesson_count?: number | null
  }[]
  upcoming_events: AdminEvent[]
  week_activity: { day: string; label: string; count: number }[]
  cache: CacheMeta
}

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken()
  if (!token) throw new Error('Не авторизовано')

  const res = await fetch(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
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

export const adminOptimateApi = {
  students: (page = 1, pageSize = 50, search = '', refresh?: boolean) =>
    adminFetch<PaginatedStudents>(
      withRefresh(
        `/api/admin/optimate/students?page=${page}&page_size=${pageSize}&search=${encodeURIComponent(search)}`,
        refresh,
      ),
    ),
  studentDetail: (id: string, refresh?: boolean) =>
    adminFetch<{ data: StudentDetail; cache: CacheMeta }>(
      withRefresh(`/api/admin/optimate/students/${id}`, refresh),
    ),
  studentAccount: (id: string) =>
    adminFetch<StudentAccount>(`/api/admin/optimate/students/${id}/account`),
  setStudentPassword: (id: string, password: string) =>
    adminFetch<StudentPasswordResult>(`/api/admin/optimate/students/${id}/password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    }),
  generateStudentPassword: (id: string) =>
    adminFetch<StudentPasswordResult>(`/api/admin/optimate/students/${id}/password/generate`, {
      method: 'POST',
    }),
  teacherAccount: (id: string) =>
    adminFetch<StudentAccount>(`/api/admin/optimate/teachers/${id}/account`),
  setTeacherPassword: (id: string, password: string) =>
    adminFetch<StudentPasswordResult>(`/api/admin/optimate/teachers/${id}/password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    }),
  generateTeacherPassword: (id: string) =>
    adminFetch<StudentPasswordResult>(`/api/admin/optimate/teachers/${id}/password/generate`, {
      method: 'POST',
    }),
  teachers: (page = 1, pageSize = 50, search = '', refresh?: boolean) =>
    adminFetch<PaginatedTeachers>(
      withRefresh(
        `/api/admin/optimate/teachers?page=${page}&page_size=${pageSize}&search=${encodeURIComponent(search)}`,
        refresh,
      ),
    ),
  teacherDetail: (id: string, refresh?: boolean) =>
    adminFetch<{ data: TeacherDetail; cache: CacheMeta }>(
      withRefresh(`/api/admin/optimate/teachers/${id}`, refresh),
    ),
  events: (
    daysBack = 1,
    daysForward = 14,
    page = 1,
    pageSize = 100,
    completionStatus = '',
    refresh?: boolean,
    teacherId = '',
    studentId = '',
  ) => {
    const params = new URLSearchParams({
      days_back: String(daysBack),
      days_forward: String(daysForward),
      page: String(page),
      page_size: String(pageSize),
      completion_status: completionStatus,
    })
    if (teacherId) params.set('teacher_id', teacherId)
    if (studentId) params.set('student_id', studentId)
    return adminFetch<PaginatedEvents>(
      withRefresh(`/api/admin/optimate/events?${params}`, refresh),
    )
  },
  eventsAll: async (
    daysBack = 7,
    daysForward = 60,
    completionStatus = '',
    refresh?: boolean,
    teacherId = '',
    studentId = '',
  ): Promise<PaginatedEvents> => {
    const pageSize = 200
    let page = 1
    const all: AdminEvent[] = []
    let total = 0
    let cache: CacheMeta | null = null
    let dateFrom = ''
    let dateTo = ''

    while (page <= 25) {
      const res = await adminOptimateApi.events(
        daysBack,
        daysForward,
        page,
        pageSize,
        completionStatus,
        refresh && page === 1,
        teacherId,
        studentId,
      )
      all.push(...res.data)
      total = res.total
      cache = res.cache
      dateFrom = res.date_from
      dateTo = res.date_to
      if (all.length >= total || res.data.length === 0) break
      page += 1
    }

    return {
      data: all,
      total,
      page: 1,
      page_size: all.length,
      date_from: dateFrom,
      date_to: dateTo,
      cache: cache ?? { cached: false, synced_at: new Date().toISOString() },
    }
  },
  overview: (refresh?: boolean) =>
    adminFetch<AdminOverview>(withRefresh('/api/admin/optimate/overview', refresh)),
  refreshAll: () => adminFetch<void>('/api/admin/optimate/refresh', { method: 'POST' }),
}

export function stripHtml(html: string | null | undefined) {
  if (!html) return ''
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n +/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export interface OptimateNote {
  id?: string
  type?: number
  type_label?: string
  body?: string
  created_at?: string | null
  author_name?: string | null
}

const NOTE_TYPE_LABELS: Record<number, string> = {
  1: 'Загальна',
  2: 'Оплата',
  3: 'Навчання',
  4: 'Адміністративна',
  5: 'Системна',
}

/** Нормалізує нотатку (parsed з API або сирий об'єкт з кешу). */
export function normalizeOptimateNote(raw: unknown): OptimateNote | null {
  if (!raw || typeof raw !== 'object') return null
  const note = raw as Record<string, unknown>

  if (typeof note.body === 'string' && note.type_label) {
    return {
      id: note.id != null ? String(note.id) : undefined,
      type: typeof note.type === 'number' ? note.type : Number(note.type) || undefined,
      type_label: String(note.type_label),
      body: note.body,
      created_at: (note.created_at ?? note.createdAt ?? null) as string | null,
      author_name: (note.author_name ?? note.authorName ?? null) as string | null,
    }
  }

  const type = Number(note.type) || 0
  const bodyRaw = String(note.body ?? note.text ?? note.content ?? '')
  const body = stripHtml(bodyRaw)
  if (!body && !type) return null

  return {
    id: note.id != null ? String(note.id) : undefined,
    type,
    type_label: NOTE_TYPE_LABELS[type] ?? (type ? `Тип ${type}` : 'Нотатка'),
    body,
    created_at: (note.createdAt ?? note.created_at ?? null) as string | null,
    author_name: (note.authorName ?? note.author_name ?? null) as string | null,
  }
}

export function statusBadgeVariant(status: number): 'teal' | 'gray' | 'amber' | 'red' | 'purple' {
  if (status === 1) return 'teal'
  if (status === 2) return 'gray'
  if (status === 3) return 'purple'
  if (status === 4) return 'amber'
  return 'gray'
}

export function zipStudentTeachers(student: {
  teacher_ids?: string[]
  teacher_names?: string[]
}): { id: string; name: string }[] {
  const ids = student.teacher_ids ?? []
  const names = student.teacher_names ?? []
  const count = Math.max(ids.length, names.length)
  const out: { id: string; name: string }[] = []
  for (let i = 0; i < count; i++) {
    const id = ids[i] ?? ''
    const name = (names[i] ?? '').trim()
    if (!id && !name) continue
    out.push({ id, name: name || 'Викладач' })
  }
  return out
}
