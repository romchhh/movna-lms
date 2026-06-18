'use client'

import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type PwaInstallPlatform = 'ios' | 'desktop-chromium' | 'desktop-safari' | 'other'

function isStandaloneDisplay() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function detectPlatform(): PwaInstallPlatform {
  if (typeof navigator === 'undefined') return 'other'
  const ua = navigator.userAgent
  const isIos =
    /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|Chrome|Edg/.test(ua)
  const isMobile = /Mobile|Android/i.test(ua) || isIos

  if (isIos && isSafari) return 'ios'
  if (!isMobile && /Chrome|Edg/.test(ua)) return 'desktop-chromium'
  if (!isMobile && isSafari) return 'desktop-safari'
  return 'other'
}

export function usePwaInstall() {
  const [isInstalled, setIsInstalled] = useState(false)
  const [platform, setPlatform] = useState<PwaInstallPlatform>('other')
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    if (isStandaloneDisplay()) {
      setIsInstalled(true)
      return
    }

    setPlatform(detectPlatform())

    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault()
      setInstallEvent(event as BeforeInstallPromptEvent)
    }

    function onAppInstalled() {
      setIsInstalled(true)
      setInstallEvent(null)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [])

  async function install() {
    if (!installEvent) return false
    await installEvent.prompt()
    const { outcome } = await installEvent.userChoice
    if (outcome === 'accepted') {
      setIsInstalled(true)
      setInstallEvent(null)
      return true
    }
    return false
  }

  return {
    isInstalled,
    platform,
    hasNativePrompt: installEvent !== null,
    showInstallUI: !isInstalled,
    install,
  }
}
