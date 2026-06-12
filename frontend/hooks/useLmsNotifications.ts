'use client'

import { HOMEWORK_UPDATED_EVENT } from '@/lib/homework-events'
import { homeworkApi } from '@/lib/homework-api'
import { lessonRequestsApi } from '@/lib/lesson-requests-api'
import { playNotificationSound, unlockNotificationSound } from '@/lib/notification-sound'
import { useCallback, useEffect, useRef, useState } from 'react'

const POLL_MS = 30_000

type LmsRole = 'student' | 'teacher' | 'admin'

export function useLmsNotifications(role: LmsRole) {
  const [homeworkCount, setHomeworkCount] = useState(0)
  const [requestsCount, setRequestsCount] = useState(0)

  const readyRef = useRef(false)
  const prevHomeworkRef = useRef(0)
  const prevRequestsRef = useRef(0)
  const seenReviewedRef = useRef<Set<number>>(new Set())

  const chimedThisPollRef = useRef(false)

  const maybeSound = useCallback((increased: boolean) => {
    if (!readyRef.current || !increased || chimedThisPollRef.current) return
    if (document.visibilityState !== 'visible') return
    chimedThisPollRef.current = true
    playNotificationSound()
  }, [])

  const refresh = useCallback(async () => {
    chimedThisPollRef.current = false
    const tasks: Promise<void>[] = []

    if (role === 'student' || role === 'teacher') {
      tasks.push(
        homeworkApi.pendingCount()
          .then(res => {
            const next = res.count
            maybeSound(next > prevHomeworkRef.current)
            prevHomeworkRef.current = next
            setHomeworkCount(next)
          })
          .catch(() => {
            prevHomeworkRef.current = 0
            setHomeworkCount(0)
          }),
      )
    }

    if (role === 'teacher' || role === 'admin') {
      tasks.push(
        lessonRequestsApi.pendingCount()
          .then(res => {
            const next = res.count
            maybeSound(next > prevRequestsRef.current)
            prevRequestsRef.current = next
            setRequestsCount(next)
          })
          .catch(() => {
            prevRequestsRef.current = 0
            setRequestsCount(0)
          }),
      )
    }

    if (role === 'student') {
      tasks.push(
        homeworkApi.myList()
          .then(list => {
            const reviewed = list.filter(i => i.status === 'reviewed')
            if (!readyRef.current) {
              reviewed.forEach(i => seenReviewedRef.current.add(i.submission_id))
            } else if (document.visibilityState === 'visible') {
              for (const item of reviewed) {
                if (!seenReviewedRef.current.has(item.submission_id)) {
                  seenReviewedRef.current.add(item.submission_id)
                  maybeSound(true)
                }
              }
            }
          })
          .catch(() => {}),
      )
    }

    await Promise.all(tasks)
    readyRef.current = true
  }, [role, maybeSound])

  useEffect(() => {
    unlockNotificationSound()
    const unlock = () => unlockNotificationSound()
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })

    void refresh()
    const interval = window.setInterval(() => void refresh(), POLL_MS)
    const onRefresh = () => void refresh()
    window.addEventListener('focus', onRefresh)
    window.addEventListener(HOMEWORK_UPDATED_EVENT, onRefresh)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', onRefresh)
      window.removeEventListener(HOMEWORK_UPDATED_EVENT, onRefresh)
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [refresh])

  return { homeworkCount, requestsCount }
}
