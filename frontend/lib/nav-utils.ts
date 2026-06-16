import type { NavItem } from '@/components/shared/Sidebar'

export function isNavActive(pathname: string, href: string): boolean {
  if (href === '/student' || href === '/teacher' || href === '/admin') {
    return pathname === href
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function flattenNavItems(sections: { label: string; items: NavItem[] }[]): NavItem[] {
  const seen = new Set<string>()
  const items: NavItem[] = []
  for (const section of sections) {
    for (const item of section.items) {
      if (seen.has(item.href)) continue
      seen.add(item.href)
      items.push(item)
    }
  }
  return items
}

const SHORT_LABELS: Record<string, string> = {
  'Домашні завдання': 'Домашні',
  'Навчальні програми': 'Програми',
  'Журнал оцінок': 'Оцінки',
  'Баланс уроків': 'Баланс',
  'Підтримка та FAQ': 'Підтримка',
  'Мої учні': 'Учні',
  'Мої групи': 'Групи',
  'Мій курс': 'Курс',
}

export function navShortLabel(label: string): string {
  return SHORT_LABELS[label] ?? label
}

export function splitMobileNav(
  sections: { label: string; items: NavItem[] }[],
  tabHrefs: string[],
) {
  const all = flattenNavItems(sections)
  const tabSet = new Set(tabHrefs)
  const tabs = tabHrefs
    .map(href => all.find(item => item.href === href))
    .filter((item): item is NavItem => Boolean(item))
  const overflow = all.filter(item => !tabSet.has(item.href))
  return { tabs, overflow, sections }
}
