'use client'

import { CacheMeta, formatCacheAge, optimateApi } from '@/lib/optimate-api'
import { IconButton, RefreshIcon } from '@/components/shared/Icons'
import { useState } from 'react'

interface OptimateSyncBarProps {
  cache: CacheMeta | null
  onRefreshed?: () => void
}

export function OptimateSyncBar({ cache, onRefreshed }: OptimateSyncBarProps) {
  const [refreshing, setRefreshing] = useState(false)

  async function handleRefresh() {
    setRefreshing(true)
    try {
      await optimateApi.refreshAll()
      onRefreshed?.()
    } finally {
      setRefreshing(false)
    }
  }

  if (!cache) return null

  return (
    <div className="optimate-sync-bar">
      <span>
        Optimate: оновлено {formatCacheAge(cache.synced_at)}
        {cache.cached ? ' · з кешу' : ' · свіжі дані'}
      </span>
      <IconButton
        label="Оновити дані Optimate"
        onClick={handleRefresh}
        loading={refreshing}
      >
        <RefreshIcon />
      </IconButton>
    </div>
  )
}
