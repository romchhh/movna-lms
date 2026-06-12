'use client'

import { homeworkApi } from '@/lib/homework-api'
import { HOMEWORK_UPDATED_EVENT } from '@/lib/homework-events'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

interface HomeworkPendingAlertProps {
  onReview?: () => void
}

export function HomeworkPendingAlert({ onReview }: HomeworkPendingAlertProps) {
  const [count, setCount] = useState(0)

  const load = useCallback(async () => {
    try {
      const res = await homeworkApi.pendingCount()
      setCount(res.count)
    } catch {
      setCount(0)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const onUpdate = () => load()
    window.addEventListener(HOMEWORK_UPDATED_EVENT, onUpdate)
    return () => window.removeEventListener(HOMEWORK_UPDATED_EVENT, onUpdate)
  }, [load])

  if (count === 0) return null

  return (
    <div className="hw-alert hw-alert--teacher">
      <div className="hw-alert-body">
        <strong>
          {count} відповід{count === 1 ? 'ь' : 'і'} на перевірці
        </strong>
        <p>Учні надіслали домашні завдання — перегляньте та залиште коментар</p>
      </div>
      {onReview ? (
        <button type="button" className="btn btn-sm btn-teal" onClick={onReview}>
          Перевірити
        </button>
      ) : (
        <Link href="/teacher/homework?filter=to_review" className="btn btn-sm btn-teal">
          Перевірити
        </Link>
      )}
    </div>
  )
}
