'use client'

import { homeworkApi, type HomeworkStudentItem } from '@/lib/homework-api'
import { HOMEWORK_UPDATED_EVENT } from '@/lib/homework-events'
import { useCallback, useEffect, useState } from 'react'

export function useStudentHomework() {
  const [items, setItems] = useState<HomeworkStudentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setItems(await homeworkApi.myList())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка')
      setItems([])
    } finally {
      setLoading(false)
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

  return { items, loading, error, reload: load }
}
