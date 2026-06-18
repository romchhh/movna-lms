import './globals.css'
import { AuthSessionBoot } from '@/components/auth/AuthSessionBoot'
import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'MOVNA LMS',
  description: 'Навчальна платформа школи MOVNA',
  icons: {
    icon: '/branding/little_logo.svg',
    shortcut: '/branding/little_logo.svg',
    apple: '/branding/little_logo.svg',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk">
      <body>
        <AuthSessionBoot />
        {children}
      </body>
    </html>
  )
}
