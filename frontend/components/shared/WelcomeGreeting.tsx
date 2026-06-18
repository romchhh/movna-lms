'use client'

import { greetingFirstName } from '@/lib/greeting-name'

interface WelcomeGreetingProps {
  name: string
}

export function WelcomeGreeting({ name }: WelcomeGreetingProps) {
  const firstName = greetingFirstName(name)
  if (!firstName) return null

  return (
    <header className="welcome-greeting" aria-label={`Привіт, ${firstName}`}>
      <p className="welcome-greeting-line">
        <span className="welcome-greeting-label">Привіт,</span>{' '}
        <span className="welcome-greeting-name">{firstName}</span>
      </p>
    </header>
  )
}
