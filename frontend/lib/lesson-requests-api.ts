import { apiFetch } from './api-fetch'

export type LessonRequestType = 'cancel' | 'reschedule'
export type LessonRequestStatus = 'pending' | 'approved' | 'rejected'

export interface LessonRequest {
  id: number
  student_id: number
  student_name: string
  optimate_event_id: string
  request_type: LessonRequestType
  status: LessonRequestStatus
  event_title: string
  event_starts_at: string
  event_ends_at: string
  teacher_name: string
  teacher_optimate_id: string
  requested_starts_at?: string | null
  requested_ends_at?: string | null
  student_comment: string
  admin_note: string
  resolved_at?: string | null
  created_at: string
}

export interface LessonRequestCreate {
  optimate_event_id: string
  request_type: LessonRequestType
  event_title: string
  event_starts_at: string
  event_ends_at: string
  teacher_name: string
  teacher_optimate_id: string
  requested_starts_at?: string
  requested_ends_at?: string
  student_comment?: string
}

const request = <T>(path: string, init?: RequestInit) =>
  apiFetch<T>(path, init, { errorMessage: 'Помилка запиту' })

export const lessonRequestsApi = {
  create: (body: LessonRequestCreate) =>
    request<LessonRequest>('/api/lesson-requests', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  list: (status = '') =>
    request<LessonRequest[]>(
      `/api/lesson-requests${status ? `?status=${encodeURIComponent(status)}` : ''}`,
    ),

  pendingCount: () =>
    request<{ count: number }>('/api/lesson-requests/pending-count'),

  resolve: (id: number, status: 'approved' | 'rejected', adminNote = '') =>
    request<LessonRequest>(`/api/lesson-requests/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, admin_note: adminNote }),
    }),
}

export const REQUEST_TYPE_LABELS: Record<LessonRequestType, string> = {
  cancel: 'Скасування',
  reschedule: 'Перенесення',
}

export const REQUEST_STATUS_LABELS: Record<LessonRequestStatus, string> = {
  pending: 'Очікує',
  approved: 'Схвалено',
  rejected: 'Відхилено',
}
