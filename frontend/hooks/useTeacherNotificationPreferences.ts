'use client'

import {
  NOTIFICATION_PREFERENCES_UPDATED_EVENT,
  notifyNotificationPreferencesUpdated,
  teacherNotificationPreferencesApi,
  type NotificationPreferences,
} from '@/lib/notification-preferences-api'
import { useCallback, useEffect, useState } from 'react'

const DEFAULTS: NotificationPreferences = {
  notify_homework: true,
  notify_lesson_reminder: true,
}

export function useTeacherNotificationPreferences(enabled = true) {
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULTS)
  const [loading, setLoading] = useState(enabled)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!enabled) {
      setPrefs(DEFAULTS)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = await teacherNotificationPreferencesApi.get()
      setPrefs(data)
    } catch {
      setPrefs(DEFAULTS)
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    void load()
    if (!enabled) return
    const onUpdate = () => void load()
    window.addEventListener(NOTIFICATION_PREFERENCES_UPDATED_EVENT, onUpdate)
    window.addEventListener('focus', onUpdate)
    return () => {
      window.removeEventListener(NOTIFICATION_PREFERENCES_UPDATED_EVENT, onUpdate)
      window.removeEventListener('focus', onUpdate)
    }
  }, [enabled, load])

  const update = useCallback(async (patch: Partial<NotificationPreferences>) => {
    if (!enabled) return
    setSaving(true)
    const optimistic = { ...prefs, ...patch }
    setPrefs(optimistic)
    try {
      const data = await teacherNotificationPreferencesApi.update(patch)
      setPrefs(data)
      notifyNotificationPreferencesUpdated()
    } catch {
      setPrefs(prefs)
      throw new Error('Не вдалося зберегти налаштування')
    } finally {
      setSaving(false)
    }
  }, [enabled, prefs])

  return { ...prefs, loading, saving, reload: load, update }
}
