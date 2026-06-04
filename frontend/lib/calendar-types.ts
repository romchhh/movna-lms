export type CalendarViewMode = 'week' | 'month' | 'agenda'

export type CalendarStatusVariant = 'green' | 'red' | 'gray' | 'amber' | 'purple' | 'teal'

export type CalendarParticipantKind = 'student' | 'teacher'

export interface CalendarParticipant {
  id: string
  name: string
  kind: CalendarParticipantKind
}

export interface CalendarEvent {
  id: string
  starts_at: string
  ends_at: string
  title: string
  subtitle?: string
  status_label?: string
  status_variant?: CalendarStatusVariant
  accent_color?: string
  tags?: string[]
  is_trial?: boolean
  product_type_label?: string
  teacher_name?: string
  student_names?: string[]
  teacher_names?: string[]
  student_ids?: string[]
  teacher_ids?: string[]
  teachers?: CalendarParticipant[]
  students?: CalendarParticipant[]
  duration_minutes?: number
  event_type_label?: string
  schedule_class?: string
  schedule_class_label?: string
}

export interface CalendarEventInput {
  id: string
  starts_at: string
  ends_at: string
  product_name?: string | null
  product_type_label?: string | null
  teacher_name?: string | null
  student_names?: string[]
  teacher_names?: string[]
  student_ids?: string[]
  teacher_ids?: string[]
  completion_label?: string
  schedule_class?: string
  product_type?: number | null
  is_trial?: boolean
  is_completed?: boolean | null
  duration?: number
  event_type_label?: string
}

const STATUS_MAP: Record<string, CalendarStatusVariant> = {
  'Проведено': 'green',
  'Скасовано': 'red',
  'Заплановано': 'gray',
}

const CLASS_COLORS: Record<string, string> = {
  individual: 'var(--a)',
  group: 'var(--p)',
  speaking_club: 'var(--t)',
  pair: 'var(--pd)',
}

const CLASS_LABELS: Record<string, string> = {
  individual: 'Індивідуальний',
  group: 'Груповий',
  speaking_club: 'Speaking club',
  pair: 'Парний',
}

function durationMinutes(startIso: string, endIso: string, fallback?: number): number | undefined {
  if (fallback != null && fallback > 0) return fallback
  const start = new Date(startIso).getTime()
  const end = new Date(endIso).getTime()
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return undefined
  return Math.round((end - start) / 60000)
}

const PRODUCT_COLORS: Record<number, string> = {
  1: 'var(--p)',
  2: 'var(--a)',
  3: 'var(--t)',
  4: 'var(--pd)',
}

const STATUS_EMOJI: Record<string, string> = {
  'Проведено': '✅',
  'Скасовано': '❌',
  'Заплановано': '📅',
}

export function eventStatusEmoji(statusLabel?: string): string {
  if (!statusLabel) return STATUS_EMOJI['Заплановано']
  return STATUS_EMOJI[statusLabel] ?? '📅'
}

function completionVariant(label?: string): CalendarStatusVariant {
  if (!label) return 'gray'
  return STATUS_MAP[label] ?? 'gray'
}

function participantDisplayName(
  name: string,
  id: string,
  kind: CalendarParticipantKind,
): string {
  const trimmed = name.trim()
  if (trimmed && !/^\d+$/.test(trimmed)) return trimmed
  return kind === 'teacher' ? 'Викладач' : 'Учень'
}

function zipParticipants(
  names: string[] | undefined,
  ids: string[] | undefined,
  kind: CalendarParticipantKind,
): CalendarParticipant[] {
  const idList = ids ?? []
  const nameList = names ?? []
  const count = Math.max(nameList.length, idList.length)
  if (count === 0) return []

  const out: CalendarParticipant[] = []
  for (let i = 0; i < count; i++) {
    const name = nameList[i] ?? ''
    const id = idList[i] ?? ''
    if (!name && !id) continue
    out.push({ id, name: participantDisplayName(name, id, kind), kind })
  }
  return out
}

function buildTeachers(raw: CalendarEventInput): CalendarParticipant[] {
  const fromLists = zipParticipants(raw.teacher_names, raw.teacher_ids, 'teacher')
  if (fromLists.length) return fromLists
  if (raw.teacher_name) {
    const id = raw.teacher_ids?.[0] ?? ''
    return [{ id, name: raw.teacher_name, kind: 'teacher' }]
  }
  return []
}

export function toCalendarEvent(raw: CalendarEventInput): CalendarEvent {
  const students = zipParticipants(raw.student_names, raw.student_ids, 'student')
  const teachers = buildTeachers(raw)
  const subtitleParts = [
    teachers[0]?.name,
    students.map(s => s.name).join(', ') || undefined,
  ].filter(Boolean)

  const accent =
    (raw.schedule_class && CLASS_COLORS[raw.schedule_class]) ||
    (raw.product_type != null && PRODUCT_COLORS[raw.product_type]) ||
    'var(--p)'

  return {
    id: raw.id,
    starts_at: raw.starts_at,
    ends_at: raw.ends_at,
    title: raw.product_name || raw.product_type_label || 'Урок',
    subtitle: subtitleParts.join(' · ') || undefined,
    status_label: raw.completion_label,
    status_variant: completionVariant(raw.completion_label),
    accent_color: accent,
    is_trial: raw.is_trial,
    product_type_label: raw.product_type_label ?? undefined,
    teacher_name: teachers[0]?.name ?? raw.teacher_name ?? undefined,
    student_names: students.map(s => s.name),
    teacher_names: teachers.map(t => t.name),
    student_ids: students.map(s => s.id).filter(Boolean),
    teacher_ids: teachers.map(t => t.id).filter(Boolean),
    students,
    teachers,
    duration_minutes: durationMinutes(raw.starts_at, raw.ends_at, raw.duration),
    event_type_label: raw.event_type_label,
    schedule_class: raw.schedule_class,
    schedule_class_label: raw.schedule_class ? CLASS_LABELS[raw.schedule_class] : undefined,
  }
}
