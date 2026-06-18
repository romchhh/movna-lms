'use client'

import type { PwaInstallPlatform } from '@/hooks/usePwaInstall'

export function PwaInstallHint({ platform }: { platform: PwaInstallPlatform }) {
  if (platform === 'ios') {
    return (
      <div className="pwa-install-hint">
        <p className="pwa-install-hint-title">iPhone / iPad</p>
        <p className="pwa-install-hint-note">
          Натисніть «Встановити додаток» — відкриється «Поділитися», потім оберіть «На екран «Додому»».
        </p>
      </div>
    )
  }

  if (platform === 'desktop-chromium') {
    return (
      <div className="pwa-install-hint">
        <p className="pwa-install-hint-title">Chrome / Edge</p>
        <p className="pwa-install-hint-note">
          Якщо кнопка «Встановити зараз» не з&apos;явилась, натисніть ⊕ у адресному рядку або меню браузера → «Встановити MOVNA».
        </p>
      </div>
    )
  }

  if (platform === 'desktop-safari') {
    return (
      <div className="pwa-install-hint">
        <p className="pwa-install-hint-title">Safari на Mac</p>
        <p className="pwa-install-hint-note">
          Натисніть «Встановити додаток» — у «Поділитися» оберіть «Додати на Dock». Або меню «Файл» → «Додати на Dock».
        </p>
      </div>
    )
  }

  return (
    <div className="pwa-install-hint">
      <p className="pwa-install-hint-title">Інший браузер</p>
      <p className="pwa-install-hint-note">
        Відкрийте сайт у Chrome, Edge або Safari — там доступне встановлення одним натисканням.
      </p>
    </div>
  )
}
