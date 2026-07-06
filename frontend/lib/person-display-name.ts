/** Імʼя для UI без дубльованих @-ніків з Optimate. */
export function cleanPersonDisplayName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return trimmed

  const parts = trimmed.split(/\s+/)
  const seenHandles = new Set<string>()
  const out: string[] = []

  for (const part of parts) {
    if (part.startsWith('@')) {
      const key = part.toLowerCase()
      if (seenHandles.has(key)) continue
      seenHandles.add(key)
    }
    out.push(part)
  }

  return out.join(' ').trim() || trimmed
}

export function teacherDisplayName(
  data: Record<string, unknown> | null | undefined,
  fallback = 'Викладач',
): string {
  if (!data) return cleanPersonDisplayName(fallback)

  const first = String(data.first_name ?? '').trim()
  const last = String(data.last_name ?? '').trim()
  const fromParts = `${first} ${last}`.trim()
  if (fromParts && fromParts !== '—') {
    return cleanPersonDisplayName(fromParts)
  }

  const full = String(data.full_name ?? '').trim()
  if (full && full !== '—') {
    return cleanPersonDisplayName(full)
  }

  return cleanPersonDisplayName(fallback)
}

export function studentDisplayName(
  data: Record<string, unknown> | null | undefined,
  fallback = 'Учень',
): string {
  if (!data) return cleanPersonDisplayName(fallback)

  const first = String(data.first_name ?? '').trim()
  const last = String(data.last_name ?? '').trim()
  const fromParts = `${first} ${last}`.trim()
  if (fromParts && fromParts !== '—') {
    return cleanPersonDisplayName(fromParts)
  }

  const full = String(data.full_name ?? '').trim()
  if (full && full !== '—') {
    return cleanPersonDisplayName(full)
  }

  return cleanPersonDisplayName(fallback)
}
