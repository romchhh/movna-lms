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
        Швидкий доступ з телефону або комп&apos;ютера — без адресного рядка браузера.
      </p>
      <PwaInstallButton variant="inline" />
    </Card>
  )
}
