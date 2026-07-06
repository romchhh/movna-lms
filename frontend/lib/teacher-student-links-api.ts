import { apiFetch } from './api-fetch'

export type StudentLinkType = 'lesson' | 'miro' | 'custom'

export interface StudentLink {
  id: number
  link_type: StudentLinkType
  url: string
  label: string
  sort_order: number
}

export interface TeacherStudentLinks {
  student_optimate_id: string
  lesson_link: StudentLink | null
  miro_link: StudentLink | null
  custom_links: StudentLink[]
}

export const LINK_TYPE_LABELS: Record<StudentLinkType, string> = {
  lesson: 'Посилання на урок',
  miro: 'Посилання на дошку Miro',
  custom: 'Довільне посилання',
}

export const teacherStudentLinksApi = {
  get(studentId: string) {
    return apiFetch<TeacherStudentLinks>(
      `/api/teacher/student-links/students/${encodeURIComponent(studentId)}`,
    )
  },
  create(payload: {
    student_optimate_id: string
    link_type: StudentLinkType
    url: string
    label?: string
  }) {
    return apiFetch<StudentLink>('/api/teacher/student-links', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  update(linkId: number, payload: { url?: string; label?: string }) {
    return apiFetch<StudentLink>(`/api/teacher/student-links/${linkId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },
  remove(linkId: number) {
    return apiFetch<void>(`/api/teacher/student-links/${linkId}`, { method: 'DELETE' })
  },
}
