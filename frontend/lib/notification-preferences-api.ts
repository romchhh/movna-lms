import { apiFetch } from './api-fetch'

export interface NotificationPreferences {
  notify_homework: boolean
  notify_lesson_reminder: boolean
}

export const NOTIFICATION_PREFERENCES_UPDATED_EVENT = 'movna:notification-preferences-updated'

export function notifyNotificationPreferencesUpdated(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(NOTIFICATION_PREFERENCES_UPDATED_EVENT))
  }
}

export const teacherNotificationPreferencesApi = {
  get() {
    return apiFetch<NotificationPreferences>('/api/teacher/settings/notifications')
  },
  update(payload: Partial<NotificationPreferences>) {
    return apiFetch<NotificationPreferences>('/api/teacher/settings/notifications', {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },
}
