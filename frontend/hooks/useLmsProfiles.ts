'use client'

import {
  fetchLmsProfiles,
  getCachedLmsProfile,
  LMS_PROFILE_UPDATED_EVENT,
  type LmsProfile,
} from '@/lib/profile-api'
import { useCallback, useEffect, useState } from 'react'

export function useLmsProfiles(optimateIds: string[]) {
  const [profiles, setProfiles] = useState<Map<string, LmsProfile>>(new Map())
  const [loading, setLoading] = useState(false)
  const key = [...new Set(optimateIds.filter(Boolean))].sort().join('|')

  const refresh = useCallback(async () => {
    const ids = key ? key.split('|') : []
    if (!ids.length) {
      setProfiles(new Map())
      return
    }
    setLoading(true)
    try {
      const map = await fetchLmsProfiles(ids)
      setProfiles(new Map(map))
    } catch {
      const fallback = new Map<string, LmsProfile>()
      for (const id of ids) {
        const cached = getCachedLmsProfile(id)
        if (cached) fallback.set(id, cached)
      }
      setProfiles(fallback)
    } finally {
      setLoading(false)
    }
  }, [key])

  useEffect(() => {
    void refresh()
    const onUpdate = () => void refresh()
    window.addEventListener(LMS_PROFILE_UPDATED_EVENT, onUpdate)
    return () => window.removeEventListener(LMS_PROFILE_UPDATED_EVENT, onUpdate)
  }, [refresh])

  return { profiles, loading, get: (id: string) => profiles.get(id) }
}

export function useLmsProfile(optimateId: string | undefined) {
  const ids = optimateId ? [optimateId] : []
  const { profiles, loading } = useLmsProfiles(ids)
  return { profile: optimateId ? profiles.get(optimateId) : undefined, loading }
}
