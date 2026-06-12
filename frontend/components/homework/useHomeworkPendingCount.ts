'use client'

import { HOMEWORK_UPDATED_EVENT } from '@/lib/homework-events'
import { homeworkApi } from '@/lib/homework-api'
import { useCallback, useEffect, useState } from 'react'

export function useHomeworkPendingCount() {
  const [count, setCount] = useState(0)

  const refresh = useCallback(() => {
    homeworkApi.pendingCount()
      .then(res => setCount(res.count))
      .catch(() => setCount(0))
  }, [])

  useEffect(() => {
    refresh()
    const onUpdate = () => refresh()
    window.addEventListener(HOMEWORK_UPDATED_EVENT, onUpdate)
    window.addEventListener('focus', onUpdate)
    return () => {
      window.removeEventListener(HOMEWORK_UPDATED_EVENT, onUpdate)
      window.removeEventListener('focus', onUpdate)
    }
  }, [refresh])

  return count
}
