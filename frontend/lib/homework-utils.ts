import { formatEventDateFull, formatTimeRange } from '@/lib/calendar-utils'
import type { CalendarEvent } from '@/lib/calendar-types'
import type { HomeworkAssignment, HomeworkStudentRef, HomeworkSubmission } from '@/lib/homework-api'

const GENERIC_TITLES = new Set(['урок', 'домашнє завдання', 'дз', 'homework'])

export function displayStudentName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return 'Учень'
  const deduped = trimmed.replace(/(@\S+)(?:\s+\1)+/gi, '$1')
  const withoutHandles = deduped.replace(/\s+@\S+/g, '').trim()
  return withoutHandles || deduped.split(/\s+/).filter(Boolean)[0] || 'Учень'
}

export function displayAssignmentTitle(assignment: HomeworkAssignment): string {
  const title = assignment.title.trim()
  if (title && !GENERIC_TITLES.has(title.toLowerCase())) return title
  const event = assignment.event_title.trim()
  if (event && !GENERIC_TITLES.has(event.toLowerCase())) return event
  return title || 'Домашнє завдання'
}

export function assignmentLessonWhen(assignment: HomeworkAssignment): string {
  return `${formatEventDateFull(assignment.event_starts_at)} · ${formatTimeRange(
    assignment.event_starts_at,
    assignment.event_ends_at,
  )}`
}

export function teacherStudentStatusLabel(sub: HomeworkSubmission): string {
  if (sub.status === 'completed') return 'Надіслав відповідь'
  if (sub.status === 'reviewed') return 'Перевірено'
  return 'Ще не здано'
}

export function assignmentCardStatus(assignment: HomeworkAssignment): {
  label: string
  variant: 'red' | 'amber' | 'green' | 'gray'
} {
  const subs = assignment.submissions
  const toReview = subs.filter(s => s.status === 'completed').length
  const waiting = subs.filter(s => s.status === 'assigned' || s.status === 'viewed').length
  const done = subs.filter(s => s.status === 'reviewed').length

  if (toReview > 0) {
    return { label: toReview === 1 ? 'На перевірці' : `${toReview} на перевірці`, variant: 'red' }
  }
  if (waiting > 0 && done === 0) {
    return { label: waiting === 1 ? 'Не здано' : `${waiting} не здали`, variant: 'amber' }
  }
  if (waiting > 0) {
    return { label: `${waiting} не здали`, variant: 'amber' }
  }
  if (done > 0 && done === subs.length) {
    return { label: 'Готово', variant: 'green' }
  }
  return { label: 'Без учнів', variant: 'gray' }
}

export function assignmentToCalendarEvent(assignment: HomeworkAssignment): CalendarEvent {
  const students = assignment.submissions.map(s => ({
    id: s.student_optimate_id,
    name: s.student_name,
    kind: 'student' as const,
  }))
  return {
    id: assignment.optimate_event_id,
    starts_at: assignment.event_starts_at,
    ends_at: assignment.event_ends_at,
    title: assignment.event_title || assignment.title,
    students,
    student_ids: students.map(s => s.id),
    student_names: students.map(s => s.name),
  }
}

export function assignmentStudents(assignment: HomeworkAssignment): HomeworkStudentRef[] {
  return assignment.submissions.map(s => ({
    optimate_id: s.student_optimate_id,
    name: s.student_name,
  }))
}
