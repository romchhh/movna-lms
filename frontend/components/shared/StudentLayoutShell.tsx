'use client'

import { StudentLessonAlertBanner } from '@/components/lesson/StudentLessonAlertBanner'
import { RoleLayoutShell } from '@/components/shared/RoleLayoutShell'
import type { SidebarProps } from '@/components/shared/Sidebar'

interface StudentLayoutShellProps {
  children: React.ReactNode
  sidebar: Omit<SidebarProps, 'sections'> & {
    sections: SidebarProps['sections']
    homeworkHref?: string
    mobileTabHrefs?: string[]
  }
}

export function StudentLayoutShell({ children, sidebar }: StudentLayoutShellProps) {
  return (
    <RoleLayoutShell sidebar={sidebar}>
      <StudentLessonAlertBanner />
      {children}
    </RoleLayoutShell>
  )
}
