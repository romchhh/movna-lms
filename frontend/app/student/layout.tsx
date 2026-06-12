import { RoleLayoutShell } from '@/components/shared/RoleLayoutShell'
import {
  BalanceNavIcon,
  CalendarNavIcon,
  CourseNavIcon,
  DashNavIcon,
  HomeworkNavIcon,
  SettingsNavIcon,
  StatsNavIcon,
  SupportNavIcon,
  VocabNavIcon,
} from '@/components/shared/NavIcons'

const sections = [
  {
    label: 'Навчання',
    items: [
      { href: '/student', label: 'Дашборд', icon: <DashNavIcon /> },
      { href: '/student/course', label: 'Мій курс', icon: <CourseNavIcon /> },
      { href: '/student/homework', label: 'Домашні завдання', icon: <HomeworkNavIcon /> },
      { href: '/student/schedule', label: 'Розклад', icon: <CalendarNavIcon /> },
    ],
  },
  {
    label: 'Прогрес',
    items: [
      { href: '/student/stats', label: 'Статистика', icon: <StatsNavIcon /> },
      { href: '/student/vocab', label: 'Словник', icon: <VocabNavIcon /> },
    ],
  },
  {
    label: 'Рахунок',
    items: [
      { href: '/student/balance', label: 'Баланс уроків', icon: <BalanceNavIcon /> },
    ],
  },
  {
    label: 'Інше',
    items: [
      { href: '/student/support', label: 'Підтримка та FAQ', icon: <SupportNavIcon /> },
      { href: '/student/settings', label: 'Налаштування', icon: <SettingsNavIcon /> },
    ],
  },
]

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleLayoutShell
      sidebar={{
        role: 'student',
        userName: 'Олена Коваль',
        userInitials: 'ОК',
        accentColor: 'var(--p)',
        accentBg: 'var(--pl)',
        sections,
        homeworkHref: '/student/homework',
      }}
    >
      {children}
    </RoleLayoutShell>
  )
}
