'use client'

import { Card, Toggle } from '@/components/shared/UI'
import { useTeacherNotificationPreferences } from '@/hooks/useTeacherNotificationPreferences'
import { useState } from 'react'

export function TeacherNotificationSettingsCard() {
  const { notify_homework, notify_lesson_reminder, loading, saving, update } =
    useTeacherNotificationPreferences()
  const [error, setError] = useState('')

  async function toggleHomework() {
    setError('')
    try {
      await update({ notify_homework: !notify_homework })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка')
    }
  }

  async function toggleLessonReminder() {
    setError('')
    try {
      await update({ notify_lesson_reminder: !notify_lesson_reminder })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка')
    }
  }

  const items = [
    {
      label: 'Нові д/з на перевірку',
      sub: 'Звукове сповіщення, коли учень здав завдання',
      on: notify_homework,
      toggle: toggleHomework,
    },
    {
      label: 'Нагадування про заняття',
      sub: 'Банер за 30 хвилин, 15 хвилин і під час уроку',
      on: notify_lesson_reminder,
      toggle: toggleLessonReminder,
    },
  ]

  return (
    <Card title="Сповіщення">
      {error && <div className="alert">{error}</div>}

      {items.map((item, i) => (
        <div
          key={i}
          className="notification-setting-row"
        >
          <div>
            <div className="notification-setting-label">{item.label}</div>
            <div className="notification-setting-sub">{item.sub}</div>
          </div>
          <Toggle
            on={item.on}
            onToggle={item.toggle}
            accent="var(--t)"
            disabled={loading || saving}
          />
        </div>
      ))}
    </Card>
  )
}
