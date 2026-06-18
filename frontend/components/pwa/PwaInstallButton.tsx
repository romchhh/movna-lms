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

export function PwaInstallButton({ variant = 'inline', className = '' }: PwaInstallButtonProps) {
  const { isInstalled, platform, hasNativePrompt, showInstallUI, install } = usePwaInstall()
  const [hintOpen, setHintOpen] = useState(false)

  if (!showInstallUI) return null

  async function handleClick() {
    if (hasNativePrompt) {
      const accepted = await install()
      if (!accepted) setHintOpen(true)
      return
    }
    setHintOpen(open => !open)
  }

  const showHintInline = platform === 'ios' && variant === 'inline'

  if (showHintInline) {
    return <PwaInstallHint platform={platform} />
  }

  return (
    <div className={`pwa-install-wrap pwa-install-wrap--${variant} ${className}`.trim()}>
      <button
        type="button"
        className={`pwa-install-btn pwa-install-btn--${variant}`}
        onClick={() => void handleClick()}
        aria-expanded={hintOpen}
      >
        <InstallAppIcon />
        <span>Додати додаток на робочий стіл</span>
      </button>
      {hintOpen && <PwaInstallHint platform={platform} />}
    </div>
  )
}
