/** Спільні UI-хелпери для списків Optimate (учні, викладачі, групи). */

export function studentInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}
