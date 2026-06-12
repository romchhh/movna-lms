'use client'

import { getToken } from '@/lib/auth'
import { useEffect, useState } from 'react'

export function useHomeworkFilePreview(url: string, enabled: boolean) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!enabled || !url) {
      setObjectUrl(null)
      setLoading(false)
      setError('')
      return
    }

    const controller = new AbortController()
    let blobUrl: string | null = null

    async function load() {
      setLoading(true)
      setError('')
      try {
        const token = getToken()
        if (!token) throw new Error('Не авторизовано')
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        })
        if (!res.ok) throw new Error('Не вдалося завантажити файл')
        const blob = await res.blob()
        if (controller.signal.aborted) return
        blobUrl = URL.createObjectURL(blob)
        setObjectUrl(blobUrl)
      } catch (err) {
        if (controller.signal.aborted) return
        setError(err instanceof Error ? err.message : 'Помилка')
        setObjectUrl(null)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    load()

    return () => {
      controller.abort()
      if (blobUrl) URL.revokeObjectURL(blobUrl)
    }
  }, [url, enabled])

  return { objectUrl, loading, error }
}
