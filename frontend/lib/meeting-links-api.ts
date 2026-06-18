import { apiFetch } from './api-fetch'

export interface MeetingLinks {
  zoom_url: string
  miro_url: string
}

export interface MeetingLinksStatus {
  complete: boolean
  missingCount: number
  zoomOk: boolean
  miroOk: boolean
}

export const MEETING_LINKS_UPDATED_EVENT = 'movna:meeting-links-updated'

export function meetingLinksStatus(links: MeetingLinks): MeetingLinksStatus {
  const zoomOk = Boolean(links.zoom_url?.trim())
  const miroOk = Boolean(links.miro_url?.trim())
  const missingCount = (zoomOk ? 0 : 1) + (miroOk ? 0 : 1)
  return { complete: missingCount === 0, missingCount, zoomOk, miroOk }
}

export function notifyMeetingLinksUpdated(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(MEETING_LINKS_UPDATED_EVENT))
  }
}

export interface LessonAlert {
  show: boolean
  phase: string
  event_id: string
  starts_at: string
  ends_at: string
  teacher_name: string
  teacher_id: string
  student_name: string
  student_id: string
  product_name: string
  zoom_url: string
  miro_url: string
  message: string
}

export const teacherMeetingLinksApi = {
  get() {
    return apiFetch<MeetingLinks>('/api/teacher/settings/meeting-links')
  },
  update(payload: MeetingLinks) {
    return apiFetch<MeetingLinks>('/api/teacher/settings/meeting-links', {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },
}

export const studentLessonAlertApi = {
  get() {
    return apiFetch<LessonAlert>('/api/student/lesson-alert')
  },
}

export const teacherLessonAlertApi = {
  get() {
    return apiFetch<LessonAlert>('/api/teacher/lesson-alert')
  },
}

export function miroEmbedUrl(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return ''
  if (trimmed.includes('live-embed')) return trimmed

  const boardMatch = trimmed.match(/miro\.com\/app\/board\/([^/?#]+)/i)
  if (boardMatch) {
    const boardId = boardMatch[1]
    return `https://miro.com/app/live-embed/${boardId}/?embedAutoplay=true`
  }

  return trimmed
}

export function lessonAlertDismissKey(eventId: string, phase: string): string {
  return `movna-lesson-alert-dismiss:${eventId}:${phase}`
}

export function isLessonAlertDismissed(eventId: string, phase: string): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(lessonAlertDismissKey(eventId, phase)) === '1'
}

export function dismissLessonAlert(eventId: string, phase: string): void {
  localStorage.setItem(lessonAlertDismissKey(eventId, phase), '1')
}

export function lessonAlertPhaseLabel(phase: string): string {
  if (phase === 'active') return 'Зараз'
  if (phase === '15') return 'Через 15 хв'
  if (phase === '30') return 'Через 30 хв'
  return ''
}
