'use client'

import { TeacherMeetingLinksAlert } from '@/components/settings/TeacherMeetingLinksAlert'
import { TeacherLessonAlertBanner } from '@/components/lesson/TeacherLessonAlertBanner'
import { RoleLayoutShell } from '@/components/shared/RoleLayoutShell'
import { useTeacherMeetingLinksStatus } from '@/hooks/useTeacherMeetingLinksStatus'
import type { SidebarProps } from '@/components/shared/Sidebar'

interface TeacherLayoutShellProps {
  children: React.ReactNode
  sidebar: Omit<SidebarProps, 'sections'> & {
    sections: SidebarProps['sections']
    requestsHref?: string
    homeworkHref?: string
    settingsHref?: string
    mobileTabHrefs?: string[]
  }
}

export function TeacherLayoutShell({ children, sidebar }: TeacherLayoutShellProps) {
  const { status } = useTeacherMeetingLinksStatus()
  const { settingsHref = '/teacher/settings', ...restSidebar } = sidebar

  return (
    <RoleLayoutShell
      sidebar={{
        ...restSidebar,
        settingsHref,
        settingsAttentionCount: status.complete ? 0 : status.missingCount,
      }}
    >
      <TeacherMeetingLinksAlert href={`${settingsHref}#meeting-links`} />
      <TeacherLessonAlertBanner />
      {children}
    </RoleLayoutShell>
  )
}
