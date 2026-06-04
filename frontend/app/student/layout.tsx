import AppShell from '@/components/shared/AppShell'

const sections = [
  {
    label: 'Навчання',
    items: [
      { href: '/student', label: 'Дашборд', icon: <DashIcon /> },
      { href: '/student/course', label: 'Мій курс', icon: <CourseIcon /> },
      { href: '/student/homework', label: 'Домашні завдання', icon: <HWIcon /> },
      { href: '/student/schedule', label: 'Розклад', icon: <CalIcon /> },
    ],
  },
  {
    label: 'Прогрес',
    items: [
      { href: '/student/stats', label: 'Статистика', icon: <StatsIcon /> },
      { href: '/student/vocab', label: 'Словник', icon: <VocabIcon /> },
    ],
  },
  {
    label: 'Рахунок',
    items: [
      { href: '/student/balance', label: 'Баланс уроків', icon: <BalanceIcon /> },
    ],
  },
  {
    label: 'Інше',
    items: [
      { href: '/student/support', label: 'Підтримка та FAQ', icon: <SupportIcon /> },
      { href: '/student/settings', label: 'Налаштування', icon: <SettingsIcon /> },
    ],
  },
]

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell
      sidebar={{
        role: 'student',
        userName: 'Олена Коваль',
        userInitials: 'ОК',
        accentColor: 'var(--p)',
        accentBg: 'var(--pl)',
        sections,
      }}
    >
      {children}
    </AppShell>
  )
}

// Icons
function DashIcon() { return <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> }
function CourseIcon() { return <svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg> }
function HWIcon() { return <svg viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg> }
function CalIcon() { return <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> }
function StatsIcon() { return <svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> }
function VocabIcon() { return <svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg> }
function BalanceIcon() { return <svg viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg> }
function SupportIcon() { return <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> }
function SettingsIcon() { return <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg> }
