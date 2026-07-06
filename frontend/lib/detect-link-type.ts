import type { StudentLinkType } from '@/lib/teacher-student-links-api'

/** Розпізнає Zoom / Meet / Teams тощо → урок; Miro → дошка. */
export function detectStudentLinkType(url: string): StudentLinkType | null {
  const u = url.trim().toLowerCase()
  if (!u) return null

  if (/miro\.com/.test(u)) return 'miro'

  if (
    /zoom\.(us|gov|com)/.test(u)
    || /meet\.google\.com/.test(u)
    || /google\.com\/meet/.test(u)
    || /teams\.microsoft\.com/.test(u)
    || /teams\.live\.com/.test(u)
    || /webex\.com/.test(u)
    || /whereby\.com/.test(u)
  ) {
    return 'lesson'
  }

  return null
}

export function linkTypeHint(url: string): string | null {
  const type = detectStudentLinkType(url)
  if (type === 'lesson') return 'Схоже на посилання на урок — тип обрано автоматично'
  if (type === 'miro') return 'Схоже на дошку Miro — тип обрано автоматично'
  return null
}
