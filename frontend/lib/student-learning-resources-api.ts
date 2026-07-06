import { apiFetch } from './api-fetch'

export interface StudentCustomLink {
  id: number
  url: string
  label: string
}

export interface StudentTeacherResources {
  teacher_optimate_id: string
  teacher_name: string
  lesson_url: string
  miro_url: string
  custom_links: StudentCustomLink[]
}

export interface StudentLearningResources {
  groups: StudentTeacherResources[]
}

export const studentLearningResourcesApi = {
  list() {
    return apiFetch<StudentLearningResources>('/api/student/learning-resources')
  },
}
