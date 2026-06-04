'use client'

import { useState } from 'react'
import { OptimateProfileCard } from '@/components/settings/OptimateProfileCard'
import { PageHeader, Card, Toggle } from '@/components/shared/UI'

export default function TeacherSettings() {
  const [notifHW, setNotifHW] = useState(true)
  const [notifClass, setNotifClass] = useState(true)
  const [notifEmail, setNotifEmail] = useState(false)

  return (
    <>
      <PageHeader title="Налаштування" />

      <div className="g2">
        <OptimateProfileCard role="teacher" />

        <Card title="Сповіщення">
          {[
            { label: 'Нові д/з на перевірку', sub: 'Сповіщення коли учень здав завдання', on: notifHW, toggle: () => setNotifHW(p => !p) },
            { label: 'Нагадування про заняття', sub: 'За 30 хвилин до початку', on: notifClass, toggle: () => setNotifClass(p => !p) },
            { label: 'Дайджест на email', sub: 'Щоденний підсумок активності', on: notifEmail, toggle: () => setNotifEmail(p => !p) },
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 11, background: 'var(--bg2)', borderRadius: 'var(--r8)', marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 13, color: 'var(--tx)' }}>{s.label}</div>
                <div style={{ fontSize: 11, color: 'var(--tx2)', marginTop: 2 }}>{s.sub}</div>
              </div>
              <Toggle on={s.on} onToggle={s.toggle} accent="var(--t)" />
            </div>
          ))}
        </Card>
      </div>
    </>
  )
}
