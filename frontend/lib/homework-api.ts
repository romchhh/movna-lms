import { apiFetch } from './api-fetch'
import { getToken } from './auth'
import { notifyHomeworkUpdated } from './homework-events'
import { homeworkStatusMeta } from './status-ui'

export type HomeworkStatus = 'assigned' | 'viewed' | 'completed' | 'reviewed'

export interface HomeworkAttachment {
  id: string
  filename: string
  url: string
  size_bytes?: number
}

export interface HomeworkStudentRef {
  optimate_id: string
  name: string
}

export interface HomeworkSubmission {
  id: number
  assignment_id: number
  student_optimate_id: string
  student_name: string
  status: HomeworkStatus
  student_answer_md: string
  student_file_url: string
  viewed_at?: string | null
  completed_at?: string | null
  teacher_review_note: string
  reviewed_at?: string | null
  created_at: string
}

export interface HomeworkAssignment {
  id: number
  optimate_event_id: string
  teacher_user_id: number
  teacher_optimate_id: string
  title: string
  body_markdown: string
  deadline_at?: string | null
  teacher_attachments: HomeworkAttachment[]
  event_starts_at: string
  event_ends_at: string
  event_title: string
  created_at: string
  updated_at: string
  submissions: HomeworkSubmission[]
}

export interface HomeworkStudentItem {
  submission_id: number
  assignment_id: number
  optimate_event_id: string
  title: string
  body_markdown: string
  deadline_at?: string | null
  teacher_attachments: HomeworkAttachment[]
  event_starts_at: string
  event_ends_at: string
  event_title: string
  teacher_name: string
  status: HomeworkStatus
  student_answer_md: string
  student_file_url: string
  teacher_review_note: string
  viewed_at?: string | null
  completed_at?: string | null
  reviewed_at?: string | null
  created_at: string
  updated_at: string
}

export interface HomeworkAssignmentInput {
  optimate_event_id: string
  title?: string
  body_markdown: string
  deadline_at?: string | null
  teacher_attachments?: HomeworkAttachment[]
  event_starts_at: string
  event_ends_at: string
  event_title: string
  students: HomeworkStudentRef[]
}

const hwFetch = <T>(path: string, init?: RequestInit) =>
  apiFetch<T>(path, init, { errorMessage: 'Помилка' })

export const homeworkApi = {
  pendingCount: () => hwFetch<{ count: number }>('/api/homework/pending-count'),
  byEvent: (eventId: string) =>
    hwFetch<HomeworkAssignment | null>(`/api/homework/by-event/${encodeURIComponent(eventId)}`),
  saveAssignment: async (data: HomeworkAssignmentInput) => {
    const res = await hwFetch<HomeworkAssignment>('/api/homework/assignments', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    notifyHomeworkUpdated()
    return res
  },
  teacherList: (filter: 'all' | 'to_review' | 'reviewed' = 'all') =>
    hwFetch<HomeworkAssignment[]>(`/api/homework/teacher?filter=${filter}`),
  myList: () => hwFetch<HomeworkStudentItem[]>('/api/homework/my'),
  myDetail: async (submissionId: number) => {
    const res = await hwFetch<HomeworkStudentItem>(`/api/homework/my/${submissionId}`)
    notifyHomeworkUpdated()
    return res
  },
  complete: async (submissionId: number, data: { student_answer_md?: string; student_file_url?: string }) => {
    const res = await hwFetch<HomeworkStudentItem>(`/api/homework/my/${submissionId}/complete`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
    notifyHomeworkUpdated()
    return res
  },
  review: async (submissionId: number, teacher_review_note: string) => {
    const res = await hwFetch<HomeworkSubmission>(`/api/homework/submissions/${submissionId}/review`, {
      method: 'PATCH',
      body: JSON.stringify({ teacher_review_note }),
    })
    notifyHomeworkUpdated()
    return res
  },
  upload: async (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return hwFetch<HomeworkAttachment>('/api/homework/upload', { method: 'POST', body: fd })
  },
}

async function fetchHomeworkFileBlob(url: string): Promise<Blob> {
  const token = getToken()
  if (!token) throw new Error('Не авторизовано')
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error('Не вдалося відкрити файл')
  return res.blob()
}

export async function downloadHomeworkFile(url: string, filename: string) {
  const blob = await fetchHomeworkFileBlob(url)
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = filename
  link.click()
  URL.revokeObjectURL(objectUrl)
}

/** @deprecated Prefer downloadHomeworkFile or inline preview */
export async function openHomeworkFile(url: string) {
  const blob = await fetchHomeworkFileBlob(url)
  const objectUrl = URL.createObjectURL(blob)
  window.open(objectUrl, '_blank', 'noopener,noreferrer')
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
}

export const HOMEWORK_STATUS_LABELS: Record<HomeworkStatus, string> = {
  assigned: 'Нове',
  viewed: 'Переглянуто',
  completed: 'На перевірці',
  reviewed: 'Перевірено',
}

/** Спрощені підписи для учня (без зайвих проміжних статусів). */
export const HOMEWORK_STUDENT_STATUS_LABELS: Record<HomeworkStatus, string> = {
  assigned: 'Зробити',
  viewed: 'Зробити',
  completed: 'Відправлено',
  reviewed: 'Перевірено',
}

export function studentHomeworkCta(status: HomeworkStatus): string {
  if (status === 'assigned' || status === 'viewed') return 'Здати'
  if (status === 'completed') return 'Переглянути'
  return 'Відкрити'
}

export function homeworkStatusVariant(status: HomeworkStatus): 'red' | 'amber' | 'green' | 'gray' | 'teal' {
  const variant = homeworkStatusMeta(status).variant
  return variant === 'purple' ? 'teal' : variant
}

export function isHomeworkOverdue(deadlineAt?: string | null, status?: HomeworkStatus): boolean {
  if (!deadlineAt || status === 'reviewed' || status === 'completed') return false
  const d = new Date(deadlineAt).getTime()
  return !Number.isNaN(d) && d < Date.now()
}

export type StudentHomeworkFilter = 'active' | 'pending' | 'done'

export function studentHomeworkCounts(items: HomeworkStudentItem[]) {
  return {
    active: items.filter(i => i.status === 'assigned' || i.status === 'viewed').length,
    pending: items.filter(i => i.status === 'completed').length,
    done: items.filter(i => i.status === 'reviewed').length,
  }
}

export function filterStudentHomework(
  items: HomeworkStudentItem[],
  filter: StudentHomeworkFilter,
): HomeworkStudentItem[] {
  if (filter === 'active') {
    return items.filter(i => i.status === 'assigned' || i.status === 'viewed')
  }
  if (filter === 'pending') {
    return items.filter(i => i.status === 'completed')
  }
  return items.filter(i => i.status === 'reviewed')
}

export function sortStudentHomework(items: HomeworkStudentItem[]): HomeworkStudentItem[] {
  return [...items].sort((a, b) => {
    const aOver = isHomeworkOverdue(a.deadline_at, a.status) ? 0 : 1
    const bOver = isHomeworkOverdue(b.deadline_at, b.status) ? 0 : 1
    if (aOver !== bOver) return aOver - bOver
    const aDeadline = a.deadline_at ? new Date(a.deadline_at).getTime() : Infinity
    const bDeadline = b.deadline_at ? new Date(b.deadline_at).getTime() : Infinity
    if (aDeadline !== bDeadline) return aDeadline - bDeadline
    return new Date(b.event_starts_at).getTime() - new Date(a.event_starts_at).getTime()
  })
}

export function teacherHomeworkCounts(assignments: HomeworkAssignment[]) {
  const toReview = assignments.filter(a =>
    a.submissions.some(s => s.status === 'completed'),
  ).length
  const reviewed = assignments.filter(a =>
    a.submissions.length > 0 && a.submissions.every(s => s.status === 'reviewed'),
  ).length
  const pendingSubs = assignments.reduce(
    (n, a) => n + a.submissions.filter(s => s.status === 'completed').length,
    0,
  )
  return { all: assignments.length, to_review: toReview, reviewed, pendingSubs }
}

export function filterTeacherHomework(
  assignments: HomeworkAssignment[],
  filter: 'all' | 'to_review' | 'reviewed',
): HomeworkAssignment[] {
  if (filter === 'to_review') {
    return assignments.filter(a => a.submissions.some(s => s.status === 'completed'))
  }
  if (filter === 'reviewed') {
    return assignments.filter(a =>
      a.submissions.length > 0 && a.submissions.every(s => s.status === 'reviewed'),
    )
  }
  return assignments
}

export function assignmentSubmissionProgress(assignment: HomeworkAssignment) {
  const total = assignment.submissions.length
  if (total === 0) return { total: 0, reviewed: 0, pending: 0, waiting: 0, pct: 0 }
  const reviewed = assignment.submissions.filter(s => s.status === 'reviewed').length
  const pending = assignment.submissions.filter(s => s.status === 'completed').length
  const waiting = assignment.submissions.filter(
    s => s.status === 'assigned' || s.status === 'viewed',
  ).length
  return { total, reviewed, pending, waiting, pct: Math.round((reviewed / total) * 100) }
}

export function formatHomeworkDeadline(deadlineAt?: string | null): string {
  if (!deadlineAt) return 'Без дедлайну'
  const d = new Date(deadlineAt)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('uk-UA', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}
