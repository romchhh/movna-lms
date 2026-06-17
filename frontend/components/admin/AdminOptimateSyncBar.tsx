'use client'

import { CacheMeta, formatCacheAge } from '@/lib/optimate-api'
import { adminOptimateApi } from '@/lib/admin-optimate-api'
import { IconButton, RefreshIcon } from '@/components/shared/Icons'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface AdminOptimateSyncBarProps {
  cache: CacheMeta | null
  onRefreshed?: () => void
  /** header — у PageHeader (десктоп); inline — у блоці фільтрів календаря */
  placement?: 'header' | 'inline'
}

function refreshTitle(cache: CacheMeta) {
  return `Оновити Optimate · ${formatCacheAge(cache.synced_at)}${cache.cached ? ' · кеш' : ''}`
}

export function AdminOptimateSyncBar({
  cache,
  onRefreshed,
  placement = 'header',
}: AdminOptimateSyncBarProps) {
  const [refreshing, setRefreshing] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  async function handleRefresh() {
    setRefreshing(true)
    try {
      await adminOptimateApi.refreshAll()
      onRefreshed?.()
    } finally {
      setRefreshing(false)
    }
  }

  if (!cache) return null

  const title = refreshTitle(cache)

  function renderButton(extraClass = '') {
    return (
      <IconButton
        className={`optimate-refresh-btn${extraClass ? ` ${extraClass}` : ''}`}
        label={title}
        title={title}
        onClick={handleRefresh}
        loading={refreshing}
        variant="ghost"
        size="sm"
      >
        <RefreshIcon />
      </IconButton>
    )
  }

  const topbarSlot = mounted ? document.getElementById('mobile-topbar-actions') : null

  return (
    <>
      {topbarSlot ? createPortal(renderButton('optimate-refresh-btn--topbar'), topbarSlot) : null}
      <span className={`optimate-refresh-desktop optimate-refresh-desktop--${placement}`}>
        {renderButton()}
      </span>
    </>
  )
}
