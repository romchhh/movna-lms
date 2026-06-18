'use client'

import { FaqAdminPanel } from '@/components/faq/FaqAdminPanel'
import { PageHeader } from '@/components/shared/UI'

export default function AdminFaqPage() {
  return (
    <>
      <PageHeader
        title="FAQ"
        sub="Редагування питань і відповідей для учнів та викладачів"
      />
      <FaqAdminPanel />
    </>
  )
}
