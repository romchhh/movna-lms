'use client'

import AppShell from '@/components/shared/AppShell'
import { useLmsNotifications } from '@/hooks/useLmsNotifications'
import type { SidebarProps } from '@/components/shared/Sidebar'

interface RoleLayoutShellProps {
  children: React.ReactNode
  sidebar: Omit<SidebarProps, 'sections'> & {
    sections: SidebarProps['sections']
    requestsHref?: string
    homeworkHref?: string
  }
}

export function RoleLayoutShell({ children, sidebar }: RoleLayoutShellProps) {
  const { homeworkCount, requestsCount: pendingCount } = useLmsNotifications(sidebar.role)
  const { requestsHref, homeworkHref, sections, ...rest } = sidebar

  const sectionsWithBadge = sections.map(section => ({
    ...section,
    items: section.items.map(item => {
      if (requestsHref && item.href === requestsHref && pendingCount > 0) {
        return { ...item, badge: pendingCount }
      }
      if (homeworkHref && item.href === homeworkHref && homeworkCount > 0) {
        return { ...item, badge: homeworkCount }
      }
      return item
    }),
  }))

  return (
    <AppShell sidebar={{ ...rest, sections: sectionsWithBadge }}>
      {children}
    </AppShell>
  )
}
