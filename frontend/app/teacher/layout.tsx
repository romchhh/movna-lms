import { RoleLayoutShell } from '@/components/shared/RoleLayoutShell'
import {
  CalendarNavIcon,
  DashNavIcon,
  GradesNavIcon,
  GroupsNavIcon,
  HomeworkNavIcon,
  MaterialsNavIcon,
  RequestsNavIcon,
  SettingsNavIcon,
  StudentsNavIcon,
} from '@/components/shared/NavIcons'

const sections = [
  {
    label: 'Основне',
    items: [
      { href: '/teacher', label: 'Дашборд', icon: <DashNavIcon /> },
      { href: '/teacher/students', label: 'Мої учні', icon: <StudentsNavIcon /> },
      { href: '/teacher/groups', label: 'Мої групи', icon: <GroupsNavIcon /> },
      { href: '/teacher/homework', label: 'Домашні завдання', icon: <HomeworkNavIcon /> },
      { href: '/teacher/schedule', label: 'Розклад', icon: <CalendarNavIcon /> },
      { href: '/teacher/requests', label: 'Запити', icon: <RequestsNavIcon /> },
    ],
  },
  {
    label: 'Матеріали',
    items: [
      { href: '/teacher/grades', label: 'Журнал оцінок', icon: <GradesNavIcon /> },
      { href: '/teacher/materials', label: 'Матеріали', icon: <MaterialsNavIcon /> },
    ],
  },
  {
    label: 'Інше',
    items: [
      { href: '/teacher/settings', label: 'Налаштування', icon: <SettingsNavIcon /> },
    ],
  },
]

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleLayoutShell
      sidebar={{
        role: 'teacher',
        userName: 'Марія Іваненко',
        userInitials: 'МІ',
        accentColor: 'var(--t)',
        accentBg: 'var(--tl)',
        sections,
        requestsHref: '/teacher/requests',
        homeworkHref: '/teacher/homework',
      }}
    >
      {children}
    </RoleLayoutShell>
  )
}
