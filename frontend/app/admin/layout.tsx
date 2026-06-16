import { RoleLayoutShell } from '@/components/shared/RoleLayoutShell'
import {
  CalendarNavIcon,
  CourseNavIcon,
  DashNavIcon,
  RequestsNavIcon,
  SettingsNavIcon,
  StudentsNavIcon,
  TeacherNavIcon,
} from '@/components/shared/NavIcons'

const sections = [
  {
    label: 'Огляд',
    items: [
      { href: '/admin', label: 'Дашборд', icon: <DashNavIcon /> },
    ],
  },
  {
    label: 'Управління',
    items: [
      { href: '/admin/students', label: 'Учні', icon: <StudentsNavIcon /> },
      { href: '/admin/teachers', label: 'Викладачі', icon: <TeacherNavIcon /> },
      { href: '/admin/events', label: 'Події', icon: <CalendarNavIcon /> },
      { href: '/admin/requests', label: 'Запити', icon: <RequestsNavIcon /> },
      { href: '/admin/curricula', label: 'Навчальні програми', icon: <CourseNavIcon /> },
      { href: '/admin/courses', label: 'Курси', icon: <CourseNavIcon /> },
    ],
  },
  {
    label: 'Система',
    items: [
      { href: '/admin/settings', label: 'Налаштування', icon: <SettingsNavIcon /> },
    ],
  },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleLayoutShell
      sidebar={{
        role: 'admin',
        userName: 'Адміністратор',
        userInitials: 'АД',
        accentColor: 'var(--r)',
        accentBg: 'var(--rl)',
        sections,
        requestsHref: '/admin/requests',
        mobileTabHrefs: [
          '/admin',
          '/admin/students',
          '/admin/events',
          '/admin/requests',
        ],
      }}
    >
      {children}
    </RoleLayoutShell>
  )
}
