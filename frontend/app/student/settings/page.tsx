'use client'

import { useState } from 'react'
import { PwaInstallCard } from '@/components/pwa/PwaInstallCard'
import { OptimateProfileCard } from '@/components/settings/OptimateProfileCard'
import { PageHeader, Card, Toggle } from '@/components/shared/UI'

export default function StudentSettings() {
  const [notifClass, setNotifClass] = useState(true)
  const [notifHW, setNotifHW] = useState(true)
  const [notifBalance, setNotifBalance] = useState(true)

  return (
    <>
      <PageHeader title="Налаштування" />
      <PwaInstallCard />
      <div className="g2">
        <OptimateProfileCard role="student" />

        <Card title="Сповіщення">
          {[
            { label: 'Нагадування про заняття', sub: 'За 30 хвилин до початку', on: notifClass, toggle: () => setNotifClass(p => !p) },
            { label: 'Дедлайн домашніх завдань', sub: 'За 1 день до дедлайну', on: notifHW, toggle: () => setNotifHW(p => !p) },
            { label: 'Малий баланс уроків', sub: 'Коли залишається ≤ 3 уроки', on: notifBalance, toggle: () => setNotifBalance(p => !p) },
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 11, background: 'var(--bg2)', borderRadius: 'var(--r8)', marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 13, color: 'var(--tx)' }}>{s.label}</div>
                <div style={{ fontSize: 11, color: 'var(--tx2)', marginTop: 2 }}>{s.sub}</div>
              </div>
              <Toggle on={s.on} onToggle={s.toggle} />
            </div>
          ))}
        </Card>
      </div>
    </>
  )
}
