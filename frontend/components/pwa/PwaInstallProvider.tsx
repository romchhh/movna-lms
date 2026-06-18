'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type PwaInstallPlatform = 'ios' | 'desktop-chromium' | 'desktop-safari' | 'other'

export type PwaInstallAction = 'installed' | 'shared' | 'hint'

interface PwaInstallContextValue {
  isInstalled: boolean
  platform: PwaInstallPlatform
  hasNativePrompt: boolean
  canShareInstall: boolean
  showInstallUI: boolean
  install: () => Promise<PwaInstallAction>
}

const PwaInstallContext = createContext<PwaInstallContextValue | null>(null)

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

function sharePayload() {
  return {
    title: 'MOVNA LMS',
    text: 'Навчальна платформа MOVNA',
    url: typeof window !== 'undefined' ? window.location.href : '/',
  }
}

function canShareInstall(platform: PwaInstallPlatform) {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return false
  if (platform !== 'ios' && platform !== 'desktop-safari') return false
  const data = sharePayload()
  return !navigator.canShare || navigator.canShare(data)
}

export function PwaInstallProvider({ children }: { children: ReactNode }) {
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

  const install = useCallback(async (): Promise<PwaInstallAction> => {
    if (installEvent) {
      await installEvent.prompt()
      const { outcome } = await installEvent.userChoice
      if (outcome === 'accepted') {
        setIsInstalled(true)
        setInstallEvent(null)
        return 'installed'
      }
      return 'hint'
    }

    if (canShareInstall(platform)) {
      try {
        await navigator.share(sharePayload())
        return 'shared'
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return 'hint'
      }
    }

    return 'hint'
  }, [installEvent, platform])

  const value = useMemo<PwaInstallContextValue>(
    () => ({
      isInstalled,
      platform,
      hasNativePrompt: installEvent !== null,
      canShareInstall: canShareInstall(platform),
      showInstallUI: !isInstalled,
      install,
    }),
    [install, installEvent, isInstalled, platform],
  )

  return <PwaInstallContext.Provider value={value}>{children}</PwaInstallContext.Provider>
}

export function usePwaInstall() {
  const ctx = useContext(PwaInstallContext)
  if (!ctx) {
    throw new Error('usePwaInstall must be used within PwaInstallProvider')
  }
  return ctx
}
