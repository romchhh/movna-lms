import type { ComponentType } from 'react'
import {
  BalanceNavIcon,
  CurriculaNavIcon,
  DashNavIcon,
  HomeworkNavIcon,
  ManageNavIcon,
  MaterialsNavIcon,
  SettingsNavIcon,
} from '@/components/shared/NavIcons'

const SECTION_ICONS: Record<string, ComponentType> = {
  Огляд: DashNavIcon,
  Управління: ManageNavIcon,
  Основне: DashNavIcon,
  Навчання: HomeworkNavIcon,
  Матеріали: MaterialsNavIcon,
  Рахунок: BalanceNavIcon,
  Інше: SettingsNavIcon,
}

export function NavSectionIcon({ label }: { label: string }) {
  const Icon = SECTION_ICONS[label] ?? CurriculaNavIcon
  return (
    <span className="nav-section-icon" aria-hidden>
      <Icon />
    </span>
  )
}
