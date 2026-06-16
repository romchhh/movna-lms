import { apiFetch } from './api-fetch'

export interface CurriculumLesson {
  number: number | null
  lesson_type: string
  topic: string
  student_activities: string
}

export interface CurriculumModule {
  name: string
  lessons: CurriculumLesson[]
}

export interface CurriculumProgram {
  sheet_id: number
  name: string
  slug: string
  modules: CurriculumModule[]
  lesson_count: number
  module_count: number
}

export interface CurriculumListResponse {
  spreadsheet_id: string
  programs: CurriculumProgram[]
  cached_at: number | null
  from_cache: boolean
}

export type CurriculumAudience = 'admin' | 'teacher'

const base = (audience: CurriculumAudience) =>
  audience === 'admin' ? '/api/admin/curricula' : '/api/teacher/curricula'

export const curriculumApi = {
  list: (audience: CurriculumAudience) =>
    apiFetch<CurriculumListResponse>(base(audience)),
  refresh: () =>
    apiFetch<CurriculumListResponse & { refreshed?: boolean }>('/api/admin/curricula/refresh', {
      method: 'POST',
    }),
}

export function lessonTypeVariant(type: string): 'purple' | 'teal' | 'amber' | 'gray' | 'green' {
  const t = type.toLowerCase()
  if (t.includes('vocab')) return 'purple'
  if (t.includes('grammar')) return 'teal'
  if (t.includes('function')) return 'amber'
  if (t.includes('speak')) return 'green'
  if (t.includes('revision') || t.includes('ревіз')) return 'gray'
  return 'gray'
}

export function lessonTypeAccentClass(type: string): string {
  const v = lessonTypeVariant(type)
  return `curr-lesson-card--${v}`
}
