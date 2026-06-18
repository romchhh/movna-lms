import { StudentLayoutShell } from '@/components/shared/StudentLayoutShell'
import {
  BalanceNavIcon,
  CalendarNavIcon,
  CurriculaNavIcon,
  DashNavIcon,
  HomeworkNavIcon,
  SettingsNavIcon,
  SupportNavIcon,
} from '@/components/shared/NavIcons'

const sections = [
  {
    label: 'Навчання',
    items: [
      { href: '/student', label: 'Дашборд', icon: <DashNavIcon /> },
      { href: '/student/curriculum', label: 'Моя програма', icon: <CurriculaNavIcon /> },
      { href: '/student/homework', label: 'Домашні завдання', icon: <HomeworkNavIcon /> },
      { href: '/student/schedule', label: 'Розклад', icon: <CalendarNavIcon /> },
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
    <StudentLayoutShell
      sidebar={{
        role: 'student',
        userName: 'Олена Коваль',
        userInitials: 'ОК',
        accentColor: 'var(--p)',
        accentBg: 'var(--pl)',
        sections,
        homeworkHref: '/student/homework',
        mobileTabHrefs: [
          '/student',
          '/student/curriculum',
          '/student/homework',
          '/student/schedule',
        ],
      }}
    >
      {children}
    </StudentLayoutShell>
  )
}
