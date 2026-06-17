'use client'

import { RequestsNavIcon } from '@/components/shared/NavIcons'
import { lessonRequestsApi } from '@/lib/lesson-requests-api'
import Link from 'next/link'
import { useEffect, useState } from 'react'

interface PendingRequestsAlertProps {
  href: string
}

export function PendingRequestsAlert({ href }: PendingRequestsAlertProps) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    lessonRequestsApi.pendingCount()
      .then(res => { if (!cancelled) setCount(res.count) })
      .catch(() => { if (!cancelled) setCount(0) })
    return () => { cancelled = true }
  }, [])

  if (count <= 0) return null

  const word = count === 1 ? 'запит' : count < 5 ? 'запити' : 'запитів'
  const verb = count === 1 ? 'неопрацьований' : 'неопрацьовані'

  return (
    <div className="pending-requests-alert">
      <span className="pending-requests-alert-text">
        <RequestsNavIcon />
        У вас {count} {verb} {word} на перенесення або скасування заняття
      </span>
      <Link href={href} className="btn btn-sm btn-secondary">
        Переглянути
      </Link>
    </div>
  )
}
