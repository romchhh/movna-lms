/** Спільні UI-хелпери для списків Optimate (учні, викладачі, групи). */

export function statusBadgeVariant(
  status: number,
): 'teal' | 'gray' | 'amber' | 'red' | 'purple' {
  if (status === 1) return 'teal'
  if (status === 2) return 'gray'
  if (status === 3) return 'purple'
  if (status === 4) return 'amber'
  return 'gray'
}

export function studentInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}
