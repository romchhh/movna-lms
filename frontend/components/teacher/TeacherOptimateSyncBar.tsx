'use client'

import { CacheMeta, formatCacheAge } from '@/lib/optimate-api'
import { teacherOptimateApi } from '@/lib/teacher-optimate-api'
import { IconButton, RefreshIcon } from '@/components/shared/Icons'
import { useState } from 'react'

interface TeacherOptimateSyncBarProps {
  cache: CacheMeta | null
  onRefreshed?: () => void
}

export function TeacherOptimateSyncBar({ cache, onRefreshed }: TeacherOptimateSyncBarProps) {
  const [refreshing, setRefreshing] = useState(false)

  async function handleRefresh() {
    setRefreshing(true)
    try {
      await teacherOptimateApi.refreshAll()
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
