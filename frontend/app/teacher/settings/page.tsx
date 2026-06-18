'use client'

import { OptimateProfileCard } from '@/components/settings/OptimateProfileCard'
import { TeacherMeetingLinksCard } from '@/components/settings/TeacherMeetingLinksCard'
import { TeacherNotificationSettingsCard } from '@/components/settings/TeacherNotificationSettingsCard'
import { PageHeader } from '@/components/shared/UI'

export default function TeacherSettings() {
  return (
    <>
      <PageHeader title="Налаштування" />

      <div className="g2">
        <OptimateProfileCard role="teacher" />
        <TeacherMeetingLinksCard />
        <TeacherNotificationSettingsCard />
      </div>
    </>
  )
}
