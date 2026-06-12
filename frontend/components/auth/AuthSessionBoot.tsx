'use client'

import { ensureValidSession } from '@/lib/auth'
import { useEffect } from 'react'

/** Продовжує сесію, якщо увімкнено «Запамʼятати мене». */
export function AuthSessionBoot() {
  useEffect(() => {
    ensureValidSession()

    function onFocus() {
      ensureValidSession()
    }

    const interval = window.setInterval(() => {
      ensureValidSession()
    }, 10 * 60 * 1000)

    window.addEventListener('focus', onFocus)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  return null
}
