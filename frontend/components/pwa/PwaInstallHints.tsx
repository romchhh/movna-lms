'use client'

import type { PwaInstallPlatform } from '@/hooks/usePwaInstall'

export function PwaInstallHint({ platform }: { platform: PwaInstallPlatform }) {
  if (platform === 'ios') {
    return (
      <div className="pwa-install-hint">
        <p className="pwa-install-hint-title">iPhone / iPad</p>
        <ol className="pwa-install-hint-steps">
          <li>Натисніть «Поділитися» у Safari</li>
          <li>Оберіть «На екран «Додому»»</li>
        </ol>
      </div>
    )
  }

  if (platform === 'desktop-chromium') {
    return (
      <div className="pwa-install-hint">
        <p className="pwa-install-hint-title">Chrome / Edge на комп&apos;ютері</p>
        <ol className="pwa-install-hint-steps">
          <li>Натисніть значок «Встановити» (⊕) праворуч у адресному рядку</li>
          <li>Або меню браузера → «Встановити MOVNA» / «Install MOVNA LMS»</li>
        </ol>
      </div>
    )
  }

  if (platform === 'desktop-safari') {
    return (
      <div className="pwa-install-hint">
        <p className="pwa-install-hint-title">Safari на Mac</p>
        <ol className="pwa-install-hint-steps">
          <li>Меню «Файл» → «Додати на Dock»</li>
          <li>Або кнопка «Поділитися» → «Додати на Dock»</li>
        </ol>
      </div>
    )
  }

  return (
    <div className="pwa-install-hint">
      <p className="pwa-install-hint-title">Інший браузер</p>
      <p className="pwa-install-hint-note">
        Спробуйте Chrome, Edge або Safari — там доступне встановлення як додаток.
      </p>
    </div>
  )
}
