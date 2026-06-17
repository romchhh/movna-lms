import { apiFetch } from './api-fetch'

export interface TeacherCurriculumAuthor {
  id: number
  full_name: string
}

export interface TeacherCurriculumLesson {
  id?: number
  number: number | null
  lesson_type: string
  topic: string
  student_activities: string
}

export interface TeacherCurriculumModule {
  id?: number
  title: string
  lessons: TeacherCurriculumLesson[]
}

export interface TeacherCurriculumProgram {
  id: number
  title: string
  is_public: boolean
  author: TeacherCurriculumAuthor
  is_mine: boolean
  can_edit: boolean
  modules: TeacherCurriculumModule[]
  module_count: number
  lesson_count: number
  created_at: string
  updated_at: string
}

export interface TeacherCurriculumSummary {
  id: number
  title: string
  is_public: boolean
  author: TeacherCurriculumAuthor
  is_mine: boolean
  can_edit: boolean
  module_count: number
  lesson_count: number
  updated_at: string
}

export interface TeacherCurriculumWrite {
  title: string
  is_public: boolean
  modules: {
    title: string
    lessons: {
      number: number | null
      lesson_type: string
      topic: string
      student_activities: string
    }[]
  }[]
}

export type EditorLesson = TeacherCurriculumLesson & { _key: string }
export type EditorModule = Omit<TeacherCurriculumModule, 'lessons'> & {
  _key: string
  lessons: EditorLesson[]
}

const base = '/api/teacher/curricula/custom'

export const teacherCurriculumApi = {
  list: () => apiFetch<{ programs: TeacherCurriculumSummary[] }>(base),
  get: (id: number) => apiFetch<TeacherCurriculumProgram>(`${base}/${id}`),
  create: (body: TeacherCurriculumWrite) =>
    apiFetch<TeacherCurriculumProgram>(base, { method: 'POST', body: JSON.stringify(body) }),
  update: (id: number, body: TeacherCurriculumWrite) =>
    apiFetch<TeacherCurriculumProgram>(`${base}/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (id: number) => apiFetch<void>(`${base}/${id}`, { method: 'DELETE' }),
}

export const LESSON_TYPE_OPTIONS = [
  'Vocabulary',
  'Grammar',
  'Functions',
  'Speaking',
  'Revision',
] as const

export function newEditorModule(): EditorModule {
  return { _key: crypto.randomUUID(), title: '', lessons: [] }
}

export function newEditorLesson(): EditorLesson {
  return {
    _key: crypto.randomUUID(),
    number: null,
    lesson_type: '',
    topic: '',
    student_activities: '',
  }
}

export function programToWrite(
  title: string,
  isPublic: boolean,
  modules: EditorModule[],
): TeacherCurriculumWrite {
  return {
    title: title.trim(),
    is_public: isPublic,
    modules: modules
      .filter(m => m.title.trim())
      .map(m => ({
        title: m.title.trim(),
        lessons: m.lessons
          .filter(l => l.topic.trim() || l.student_activities.trim() || l.lesson_type.trim())
          .map(l => ({
            number: l.number,
            lesson_type: l.lesson_type.trim(),
            topic: l.topic.trim(),
            student_activities: l.student_activities.trim(),
          })),
      })),
  }
}

export function emptyProgramToEditor(): {
  title: string
  isPublic: boolean
  modules: EditorModule[]
} {
  return {
    title: '',
    isPublic: false,
    modules: [{ ...newEditorModule(), title: 'Модуль 1', lessons: [newEditorLesson()] }],
  }
}

export function programToEditor(program: TeacherCurriculumProgram) {
  return {
    title: program.title,
    isPublic: program.is_public,
    modules: program.modules.map(m => ({
      ...m,
      _key: crypto.randomUUID(),
      lessons: m.lessons.map(l => ({ ...l, _key: crypto.randomUUID() })),
    })),
  }
}
