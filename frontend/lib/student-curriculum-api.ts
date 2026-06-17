import { apiFetch } from './api-fetch'

export interface CurriculumSlot {
  id: number
  sequence_index: number
  module_index: number
  module_title: string
  lesson_number: number | null
  lesson_type: string
  topic: string
  student_activities: string
  split_part: number
  split_total: number
  split_group_key: string
  optimate_event_id: string
  event_starts_at: string
  status: 'pending' | 'scheduled' | 'completed' | 'skipped'
  completed_at: string | null
  display_topic: string
}

export interface ModuleProgress {
  module_index: number
  module_title: string
  total_slots: number
  completed_slots: number
  slots: CurriculumSlot[]
}

export interface EnrollmentSummary {
  id: number
  program_title: string
  curriculum_source: 'movna' | 'custom'
  movna_program_slug: string
  teacher_curriculum_id: number | null
  status: string
  teacher_name: string
  assigned_at: string
  ended_at: string | null
  total_slots: number
  completed_slots: number
  scheduled_slots: number
  progress_pct: number
}

export interface EnrollmentDetail extends EnrollmentSummary {
  student_optimate_id: string
  student_name: string
  teacher_optimate_id: string
  start_sequence_index: number
  modules: ModuleProgress[]
  slots: CurriculumSlot[]
}

export interface TeacherStudentCurriculum {
  student_optimate_id: string
  student_name: string
  active: EnrollmentDetail | null
  history: EnrollmentSummary[]
}

export interface StudentCurriculumOverview {
  active: EnrollmentDetail | null
  history: EnrollmentSummary[]
}

export interface AssignCurriculumPayload {
  student_optimate_id: string
  student_name?: string
  curriculum_source: 'movna' | 'custom'
  movna_program_slug?: string
  teacher_curriculum_id?: number
  start_module_index?: number
  start_lesson_index?: number
  sync_events?: boolean
}

export interface EventTopic {
  optimate_event_id: string
  program_title: string
  topic: string
  module_title: string
  lesson_type: string
  lesson_number: number | null
  slot_id: number | null
  enrollment_id: number | null
  status: string
  display_topic: string
}

export const teacherStudentCurriculumApi = {
  getStudent(studentId: string) {
    return apiFetch<TeacherStudentCurriculum>(`/api/teacher/student-curricula/students/${studentId}`)
  },
  assign(payload: AssignCurriculumPayload) {
    return apiFetch<EnrollmentDetail>('/api/teacher/student-curricula/assign', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  replace(payload: AssignCurriculumPayload) {
    return apiFetch<EnrollmentDetail>('/api/teacher/student-curricula/replace', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  syncEvents(enrollmentId: number) {
    return apiFetch<{ mapped_count: number; enrollment: EnrollmentDetail }>(
      `/api/teacher/student-curricula/enrollments/${enrollmentId}/sync-events`,
      { method: 'POST' },
    )
  },
  splitSlot(slotId: number) {
    return apiFetch<EnrollmentDetail>(`/api/teacher/student-curricula/slots/${slotId}/split`, {
      method: 'POST',
    })
  },
  completeSlot(slotId: number) {
    return apiFetch<CurriculumSlot>(`/api/teacher/student-curricula/slots/${slotId}/complete`, {
      method: 'POST',
    })
  },
  getEnrollment(enrollmentId: number) {
    return apiFetch<EnrollmentDetail>(`/api/teacher/student-curricula/enrollments/${enrollmentId}`)
  },
  eventTopic(eventId: string, studentOptimateId: string) {
    return apiFetch<EventTopic>(
      `/api/teacher/student-curricula/events/${eventId}/topic?student_optimate_id=${encodeURIComponent(studentOptimateId)}`,
    )
  },
}

export const studentCurriculumApi = {
  overview() {
    return apiFetch<StudentCurriculumOverview>('/api/student/curriculum')
  },
  enrollment(enrollmentId: number) {
    return apiFetch<EnrollmentDetail>(`/api/student/curriculum/enrollments/${enrollmentId}`)
  },
  eventTopic(eventId: string) {
    return apiFetch<EventTopic>(`/api/student/curriculum/events/${eventId}/topic`)
  },
}

export function slotStatusLabel(status: CurriculumSlot['status']): string {
  const map: Record<CurriculumSlot['status'], string> = {
    pending: 'Очікує',
    scheduled: 'Заплановано',
    completed: 'Пройдено',
    skipped: 'Пропущено',
  }
  return map[status] ?? status
}
