'use client'

interface SidebarCollapseIconProps {
  collapsed: boolean
}

export function SidebarCollapseIcon({ collapsed }: SidebarCollapseIconProps) {
  if (collapsed) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden>
        <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.75" />
        <rect x="5.5" y="7" width="4.5" height="10" rx="1" fill="currentColor" opacity="0.22" />
        <path d="M13.5 12H19M16.5 9.5L19 12l-2.5 2.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <rect x="5.5" y="7" width="4.5" height="10" rx="1" fill="currentColor" opacity="0.22" />
      <path d="M12.5 12H7M10 9.5L7.5 12 10 14.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
