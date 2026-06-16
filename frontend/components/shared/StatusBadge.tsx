import { Badge } from '@/components/shared/UI'
import {
  statusMetaByLabel,
  statusMetaForOptimate,
  statusText,
  type StatusBadgeVariant,
  type StatusMeta,
} from '@/lib/status-ui'

interface StatusBadgeProps {
  label: string
  variant?: StatusBadgeVariant
  emoji?: string
  status?: number
  meta?: StatusMeta
}

export function StatusBadge({ label, variant, emoji, status, meta }: StatusBadgeProps) {
  const resolved = meta
    ?? (status != null ? statusMetaForOptimate(status, label) : statusMetaByLabel(label))

  const finalVariant = variant ?? resolved.variant
  const finalEmoji = emoji ?? resolved.emoji
  const text = statusText(finalEmoji === '•' ? '' : finalEmoji, label)

  return <Badge variant={finalVariant}>{text}</Badge>
}
