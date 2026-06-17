'use client'

import { CloseIcon, IconButton, RefreshIcon } from '@/components/shared/Icons'
import type { ReactNode } from 'react'

interface AppModalHeaderProps {
  title: string
  titleId?: string
  meta?: ReactNode
  subtitle?: ReactNode
  badges?: ReactNode
  onClose: () => void
  onRefresh?: () => void
  refreshLoading?: boolean
  actions?: ReactNode
  compact?: boolean
}

export function AppModalHeader({
  title,
  titleId,
  meta,
  subtitle,
  badges,
  onClose,
  onRefresh,
  refreshLoading,
  actions,
  compact,
}: AppModalHeaderProps) {
  return (
    <div className={`app-modal-header${compact ? ' app-modal-header--compact' : ''}`}>
      <div className="app-modal-header-text">
        {badges}
        <h2 id={titleId}>{title}</h2>
        {meta && <p className="app-modal-meta">{meta}</p>}
        {subtitle && <p className="app-modal-sub">{subtitle}</p>}
      </div>
      <div className="app-modal-header-actions">
        {actions}
        {onRefresh && (
          <IconButton
            label="Оновити"
            onClick={onRefresh}
            loading={refreshLoading}
            variant="ghost"
            className="app-modal-icon-btn"
          >
            <RefreshIcon />
          </IconButton>
        )}
        <IconButton
          label="Закрити"
          onClick={onClose}
          variant="ghost"
          className="app-modal-icon-btn"
        >
          <CloseIcon />
        </IconButton>
      </div>
    </div>
  )
}
