'use client'

import AppShell from '@/components/shared/AppShell'
import { useLmsNotifications } from '@/hooks/useLmsNotifications'
import { useSessionProfile } from '@/hooks/useSessionProfile'
import { personInitials } from '@/lib/profile-api'
import type { SidebarProps } from '@/components/shared/Sidebar'

interface RoleLayoutShellProps {
  children: React.ReactNode
  sidebar: Omit<SidebarProps, 'sections'> & {
    sections: SidebarProps['sections']
    requestsHref?: string
    homeworkHref?: string
    settingsHref?: string
    settingsAttentionCount?: number
    mobileTabHrefs?: string[]
  }
}

export function RoleLayoutShell({ children, sidebar }: RoleLayoutShellProps) {
  const { homeworkCount, requestsCount: pendingCount } = useLmsNotifications(sidebar.role)
  const {
    requestsHref,
    homeworkHref,
    settingsHref,
    settingsAttentionCount = 0,
    sections,
    mobileTabHrefs,
    ...rest
  } = sidebar
  const { profile } = useSessionProfile()
  const displayName = profile?.full_name?.trim() || rest.userName
  const displayInitials = personInitials(displayName)
  const avatarUrl = profile?.avatar_url || ''

  const sectionsWithBadge = sections.map(section => ({
    ...section,
    items: section.items.map(item => {
      if (requestsHref && item.href === requestsHref && pendingCount > 0) {
        return { ...item, badge: pendingCount }
      }
      if (homeworkHref && item.href === homeworkHref && homeworkCount > 0) {
        return { ...item, badge: homeworkCount }
      }
      if (settingsHref && item.href === settingsHref && settingsAttentionCount > 0) {
        return { ...item, badge: settingsAttentionCount, badgeAttention: true as const }
      }
      return item
    }),
  }))

  return (
    <AppShell sidebar={{
      ...rest,
      userName: displayName,
      userInitials: displayInitials,
      avatarUrl,
      sections: sectionsWithBadge,
      mobileTabHrefs,
    }}>
      {children}
    </AppShell>
  )
}
