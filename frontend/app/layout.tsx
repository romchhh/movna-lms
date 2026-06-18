import './globals.css'
import { AuthSessionBoot } from '@/components/auth/AuthSessionBoot'
import { PwaInstallProvider } from '@/components/pwa/PwaInstallProvider'
import { PwaRegister } from '@/components/pwa/PwaRegister'
import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'MOVNA LMS',
  description: 'Навчальна платформа школи MOVNA',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'MOVNA',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/branding/little_logo.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0E4486',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk">
      <body>
        <PwaInstallProvider>
          <AuthSessionBoot />
          <PwaRegister />
          {children}
        </PwaInstallProvider>
      </body>
    </html>
  )
}
