'use client'

import { TeacherStudentDetailView } from '@/components/teacher/TeacherStudentDetailView'
import { use } from 'react'

export default function TeacherStudentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  return <TeacherStudentDetailView studentId={decodeURIComponent(id)} />
}
