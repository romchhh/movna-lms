'use client'

import { useState } from 'react'
import { PwaInstallHint } from '@/components/pwa/PwaInstallHints'
import { usePwaInstall } from '@/hooks/usePwaInstall'

function InstallAppIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="pwa-install-icon">
      <rect x="3" y="3" width="18" height="18" rx="4" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 7v10M7 12h10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

interface PwaInstallButtonProps {
  variant?: 'sidebar' | 'sheet' | 'inline'
  className?: string
}

function installLabel(hasNativePrompt: boolean, canShareInstall: boolean) {
  if (hasNativePrompt) return 'Встановити зараз'
  if (canShareInstall) return 'Встановити додаток'
  return 'Додати додаток на робочий стіл'
}

export function PwaInstallButton({ variant = 'inline', className = '' }: PwaInstallButtonProps) {
  const { platform, hasNativePrompt, canShareInstall, showInstallUI, install } = usePwaInstall()
  const [hintOpen, setHintOpen] = useState(false)
  const [shareNote, setShareNote] = useState(false)

  if (!showInstallUI) return null

  async function handleClick() {
    setShareNote(false)
    const result = await install()
    if (result === 'installed') return
    if (result === 'shared') {
      setShareNote(true)
      return
    }
    setHintOpen(true)
  }

  const oneClick = hasNativePrompt || canShareInstall

  return (
    <div className={`pwa-install-wrap pwa-install-wrap--${variant} ${className}`.trim()}>
      <button
        type="button"
        className={`pwa-install-btn pwa-install-btn--${variant}${oneClick ? ' pwa-install-btn--primary' : ''}`}
        onClick={() => void handleClick()}
        aria-expanded={hintOpen || shareNote}
      >
        <InstallAppIcon />
        <span>{installLabel(hasNativePrompt, canShareInstall)}</span>
      </button>
      {shareNote && (
        <p className="pwa-install-share-note">
          {platform === 'ios'
            ? 'Оберіть «На екран «Додому»» у меню «Поділитися».'
            : 'Оберіть «Додати на Dock» у меню «Поділитися».'}
        </p>
      )}
      {hintOpen && <PwaInstallHint platform={platform} />}
    </div>
  )
}
