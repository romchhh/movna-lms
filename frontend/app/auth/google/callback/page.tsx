'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function GoogleCallbackInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState('')

  useEffect(() => {
    const accessToken = searchParams.get('access_token')
    const role = searchParams.get('role')
    const err = searchParams.get('error')

    if (err) {
      setError(err)
      return
    }

    if (!accessToken || !role) {
      setError('Невірна відповідь від сервера')
      return
    }

    document.cookie = `token=${accessToken}; path=/; max-age=${60 * 60 * 24}`

    if (role === 'admin') router.replace('/admin')
    else if (role === 'teacher') router.replace('/teacher')
    else router.replace('/student')
  }, [router, searchParams])

  if (error) {
    return (
      <div className="login-page">
        <div className="login-card">
          <h1 className="login-title">Помилка входу</h1>
          <div className="alert">{error}</div>
          <a href="/auth/login" className="btn btn-primary btn-full">Спробувати знову</a>
        </div>
      </div>
    )
  }

  return (
    <div className="login-page">
      <div className="login-card login-card--centered">
        <p className="login-subtitle">Завершуємо вхід через Google...</p>
      </div>
    </div>
  )
}

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={
      <div className="login-page">
        <div className="login-card login-card--centered">
          <p className="login-subtitle">Завантаження...</p>
        </div>
      </div>
    }>
      <GoogleCallbackInner />
    </Suspense>
  )
}
