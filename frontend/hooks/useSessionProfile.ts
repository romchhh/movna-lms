'use client'

import { profileApi, LMS_PROFILE_UPDATED_EVENT, type LmsProfile } from '@/lib/profile-api'
import { useCallback, useEffect, useState } from 'react'

export function useSessionProfile(enabled = true) {
  const [profile, setProfile] = useState<LmsProfile | null>(null)
  const [loading, setLoading] = useState(enabled)

  const load = useCallback(async () => {
    if (!enabled) {
      setProfile(null)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = await profileApi.me()
      setProfile(data)
    } catch {
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    void load()
    const onUpdate = () => void load()
    window.addEventListener(LMS_PROFILE_UPDATED_EVENT, onUpdate)
    return () => window.removeEventListener(LMS_PROFILE_UPDATED_EVENT, onUpdate)
  }, [load])

  return { profile, loading }
}
