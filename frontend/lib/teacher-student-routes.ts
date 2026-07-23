export function teacherStudentPagePath(studentId: string): string {
  return `/teacher/students/${encodeURIComponent(studentId)}`
}
