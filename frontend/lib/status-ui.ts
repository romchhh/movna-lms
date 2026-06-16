import type { HomeworkStatus } from '@/lib/homework-api'
import type { LessonRequestStatus, LessonRequestType } from '@/lib/lesson-requests-api'

export type StatusBadgeVariant = 'purple' | 'teal' | 'amber' | 'red' | 'green' | 'gray'

export type StatusChipAccent = 'purple' | 'teal' | 'red' | 'green' | 'amber' | 'gray'

export interface StatusMeta {
  emoji: string
  variant: StatusBadgeVariant
}

export interface StatusChipMeta extends StatusMeta {
  label: string
}

export const STATUS_CHIP_STYLES: Record<
  StatusChipAccent,
  { activeBg: string; activeColor: string; activeBorder: string }
> = {
  purple: { activeBg: 'var(--pl)', activeColor: 'var(--pd)', activeBorder: 'var(--pm)' },
  teal: { activeBg: 'var(--tl)', activeColor: 'var(--td)', activeBorder: 'var(--t)' },
  red: { activeBg: 'var(--rl)', activeColor: 'var(--rd)', activeBorder: 'var(--rd)' },
  green: { activeBg: 'var(--gl)', activeColor: 'var(--gd)', activeBorder: 'var(--gd)' },
  amber: { activeBg: 'var(--al)', activeColor: '#633806', activeBorder: 'var(--a)' },
  gray: { activeBg: 'var(--bg3)', activeColor: 'var(--tx2)', activeBorder: 'var(--bd2)' },
}

const OPTIMATE_STATUS: Record<number, StatusMeta> = {
  1: { emoji: '✅', variant: 'teal' },
  2: { emoji: '📦', variant: 'gray' },
  3: { emoji: '✨', variant: 'purple' },
  4: { emoji: '⏸️', variant: 'amber' },
  5: { emoji: '⏳', variant: 'amber' },
}

const STATUS_BY_LABEL: Record<string, StatusMeta> = {
  Активний: { emoji: '✅', variant: 'teal' },
  Активні: { emoji: '✅', variant: 'teal' },
  Архів: { emoji: '📦', variant: 'gray' },
  Новий: { emoji: '✨', variant: 'purple' },
  Нові: { emoji: '✨', variant: 'purple' },
  'На паузі': { emoji: '⏸️', variant: 'amber' },
  Очікування: { emoji: '⏳', variant: 'amber' },
  Очікує: { emoji: '⏳', variant: 'amber' },
  Очікують: { emoji: '⏳', variant: 'amber' },
  Схвалено: { emoji: '✅', variant: 'green' },
  Схвалені: { emoji: '✅', variant: 'green' },
  Відхилено: { emoji: '❌', variant: 'red' },
  Відхилені: { emoji: '❌', variant: 'red' },
  Проведено: { emoji: '✅', variant: 'green' },
  Скасовано: { emoji: '❌', variant: 'red' },
  Заплановано: { emoji: '📅', variant: 'purple' },
  Скасування: { emoji: '🚫', variant: 'red' },
  Перенесення: { emoji: '📅', variant: 'amber' },
  Прострочено: { emoji: '⚠️', variant: 'red' },
  'Малий баланс': { emoji: '⚠️', variant: 'amber' },
  Всі: { emoji: '📋', variant: 'gray' },
  Усі: { emoji: '📋', variant: 'gray' },
  Зробити: { emoji: '📝', variant: 'red' },
  Відправлені: { emoji: '📤', variant: 'teal' },
  Перевірені: { emoji: '✅', variant: 'green' },
  Перевірити: { emoji: '👀', variant: 'amber' },
  Готово: { emoji: '✅', variant: 'green' },
  Нове: { emoji: '📝', variant: 'red' },
  Переглянуто: { emoji: '👀', variant: 'amber' },
  'На перевірці': { emoji: '👀', variant: 'teal' },
  Перевірено: { emoji: '✅', variant: 'green' },
  'Не здано': { emoji: '📝', variant: 'amber' },
  'Надіслав відповідь': { emoji: '📤', variant: 'teal' },
  'Ще не здано': { emoji: '📝', variant: 'amber' },
}

export function statusText(emoji: string, label: string): string {
  return emoji ? `${emoji} ${label}` : label
}

export function optimateStatusMeta(status: number): StatusMeta {
  return OPTIMATE_STATUS[status] ?? { emoji: '•', variant: 'gray' }
}

export function statusBadgeVariant(status: number): StatusBadgeVariant {
  return optimateStatusMeta(status).variant
}

export function groupStatusMeta(status: number): StatusMeta {
  if (status === 1) return { emoji: '✅', variant: 'teal' }
  if (status === 2) return { emoji: '⏸️', variant: 'amber' }
  return { emoji: '•', variant: 'gray' }
}

export function statusMetaByLabel(label: string): StatusMeta {
  const key = label.trim()
  return STATUS_BY_LABEL[key] ?? { emoji: '•', variant: 'gray' }
}

export function statusMetaForOptimate(status: number, label: string): StatusMeta {
  const byNumber = OPTIMATE_STATUS[status]
  if (byNumber) return byNumber
  return statusMetaByLabel(label)
}

export function homeworkStatusMeta(status: HomeworkStatus): StatusMeta {
  if (status === 'assigned') return { emoji: '📝', variant: 'red' }
  if (status === 'viewed') return { emoji: '👀', variant: 'amber' }
  if (status === 'completed') return { emoji: '📤', variant: 'teal' }
  return { emoji: '✅', variant: 'green' }
}

export function homeworkStatusVariant(status: HomeworkStatus): StatusBadgeVariant {
  return homeworkStatusMeta(status).variant
}

export function lessonRequestStatusMeta(status: LessonRequestStatus): StatusMeta {
  if (status === 'pending') return { emoji: '⏳', variant: 'amber' }
  if (status === 'approved') return { emoji: '✅', variant: 'green' }
  return { emoji: '❌', variant: 'red' }
}

export function lessonRequestTypeMeta(type: LessonRequestType): StatusMeta {
  if (type === 'cancel') return { emoji: '🚫', variant: 'red' }
  return { emoji: '📅', variant: 'amber' }
}

export function lessonRequestFilterChips(): StatusChipMeta[] {
  return [
    { label: 'Всі', emoji: '📋', variant: 'gray' },
    { label: 'Очікують', emoji: '⏳', variant: 'amber' },
    { label: 'Схвалені', emoji: '✅', variant: 'green' },
    { label: 'Відхилені', emoji: '❌', variant: 'red' },
  ]
}

export function eventStatusEmoji(statusLabel?: string): string {
  if (!statusLabel) return '📅'
  return statusMetaByLabel(statusLabel).emoji === '•'
    ? '📅'
    : statusMetaByLabel(statusLabel).emoji
}

export function chipMetaFromLabel(label: string): StatusChipMeta {
  const meta = statusMetaByLabel(label)
  return { label, ...meta }
}

export function variantToChipAccent(variant: StatusBadgeVariant): StatusChipAccent {
  if (variant === 'teal') return 'teal'
  if (variant === 'green') return 'green'
  if (variant === 'amber') return 'amber'
  if (variant === 'red') return 'red'
  if (variant === 'purple') return 'purple'
  return 'gray'
}
