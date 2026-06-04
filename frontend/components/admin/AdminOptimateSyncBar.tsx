'use client'

import { CacheMeta, formatCacheAge } from '@/lib/optimate-api'
import { adminOptimateApi } from '@/lib/admin-optimate-api'
import { IconButton, RefreshIcon } from '@/components/shared/Icons'
import { useState } from 'react'

interface AdminOptimateSyncBarProps {
  cache: CacheMeta | null
  onRefreshed?: () => void
}

export function AdminOptimateSyncBar({ cache, onRefreshed }: AdminOptimateSyncBarProps) {
  const [refreshing, setRefreshing] = useState(false)

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
