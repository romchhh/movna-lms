'use client'

import { LessonRequestsPanel } from '@/components/lesson-requests/LessonRequestsPanel'
import { PageHeader } from '@/components/shared/UI'

export default function TeacherRequestsPage() {
  return (
    <>
      <PageHeader
        title="Запити"
        sub="Запити учнів на скасування або перенесення ваших занять"
      />
      <LessonRequestsPanel role="teacher" />
    </>
  )
}
