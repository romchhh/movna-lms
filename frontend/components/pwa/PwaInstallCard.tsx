'use client'

import { Card } from '@/components/shared/UI'
import { PwaInstallButton } from '@/components/pwa/PwaInstallButton'
import { usePwaInstall } from '@/hooks/usePwaInstall'

export function PwaInstallCard() {
  const { isInstalled } = usePwaInstall()

  if (isInstalled) return null

  return (
    <Card title="Додаток на робочому столі" className="pwa-install-card">
      <p className="pwa-install-card-text">
        Натисніть кнопку — відкриється встановлення (Chrome/Edge) або меню «Поділитися» (iPhone, Safari).
      </p>
      <PwaInstallButton variant="inline" />
    </Card>
  )
}
