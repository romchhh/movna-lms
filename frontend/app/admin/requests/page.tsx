'use client'

import { LessonRequestsPanel } from '@/components/lesson-requests/LessonRequestsPanel'
import { PageHeader } from '@/components/shared/UI'

export default function AdminRequestsPage() {
  return (
    <>
      <PageHeader
        title="Запити"
        sub="Запити учнів на скасування або перенесення занять"
      />
      <LessonRequestsPanel role="admin" />
    </>
  )
}
