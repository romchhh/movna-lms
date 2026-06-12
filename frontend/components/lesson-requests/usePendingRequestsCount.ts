'use client'

import { lessonRequestsApi } from '@/lib/lesson-requests-api'
import { useEffect, useState } from 'react'

export function usePendingRequestsCount() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    lessonRequestsApi.pendingCount()
      .then(res => { if (!cancelled) setCount(res.count) })
      .catch(() => { if (!cancelled) setCount(0) })
    return () => { cancelled = true }
  }, [])

  return count
}
