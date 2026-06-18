'use client'

import Link from 'next/link'
import {
  decodePayload,
  ensureValidSession,
  getToken,
  homeForRole,
  loadLoginCredentials,
  saveLoginCredentials,
  setSession,
} from '@/lib/auth'
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    const urlError = searchParams.get('error')
    if (urlError) setError(decodeURIComponent(urlError))

    const saved = loadLoginCredentials()
    if (saved) {
      setEmail(saved.email)
      setPassword(saved.password)
      setRememberMe(true)
    }

    ;(async () => {
      const ok = await ensureValidSession()
      if (ok) {
        const token = getToken()
        const role = token ? decodePayload(token)?.role : null
        if (role) {
          router.replace(homeForRole(role))
          return
        }
      }
      setCheckingSession(false)
    })()
  }, [router, searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, remember_me: rememberMe }),
      })
      if (!res.ok) {
        const d = await res.json()
        const detail = d.detail
        throw new Error(
          typeof detail === 'string'
            ? detail
            : Array.isArray(detail)
              ? detail.map((x: { msg?: string }) => x.msg).join(', ')
              : 'Помилка входу'
        )
      }
      const data = await res.json()
      setSession(data.access_token, data.refresh_token, rememberMe)
      saveLoginCredentials(email, password, rememberMe)
      router.push(homeForRole(data.role))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Помилка')
    } finally {
      setLoading(false)
    }
  }

  function handleGoogleLogin() {
    window.location.href = '/api/auth/google/login'
  }

  if (checkingSession) {
    return (
      <div className="login-page">
        <div className="login-card login-card--centered">
          <p className="login-subtitle">Перевірка сесії...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo-wrap">
          <img
            src="/branding/movna-logo.svg"
            alt="Movna"
            className="login-logo"
            width={157}
            height={36}
          />
        </div>

        <h1 className="login-title">Вхід в кабінет</h1>
        <p className="login-subtitle">
          Введіть дані, які вам надала школа
        </p>

        {error && (
          <div className="alert" style={{ marginBottom: 16 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--r)', flexShrink: 0 }} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div>
            <label className="login-label" htmlFor="login-email">Email</label>
            <input
              id="login-email"
              className="input"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div>
            <label className="login-label" htmlFor="login-password">Пароль</label>
            <input
              id="login-password"
              className="input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete={rememberMe ? 'current-password' : 'off'}
              required
            />
          </div>

          <label className="login-remember">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={e => setRememberMe(e.target.checked)}
            />
            <span>Запамʼятати мене</span>
          </label>

          <button
            type="submit"
            className="btn btn-primary btn-full"
            style={{ marginTop: 10 }}
            disabled={loading}
          >
            {loading ? 'Входимо...' : 'Увійти'}
          </button>
        </form>

        <div className="login-divider">
          <span>або</span>
        </div>

        <button
          type="button"
          className="btn btn-google btn-full"
          onClick={handleGoogleLogin}
        >
          <svg viewBox="0 0 24 24" aria-hidden width="20" height="20">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Увійти через Google
        </button>

        <p className="login-help">
          Забули пароль? Напишіть{' '}
          <a
            href="https://t.me/Natalka_technical_support"
            target="_blank"
            rel="noopener noreferrer"
            className="login-help-link"
          >
            @Natalka_technical_support
          </a>{' '}
          у Telegram
        </p>

        <nav className="login-legal" aria-label="Правові документи">
          <Link href="/privacy" className="login-legal-link">
            Політика конфіденційності
          </Link>
          <span className="login-legal-sep" aria-hidden>·</span>
          <Link href="/terms" className="login-legal-link">
            Умови використання
          </Link>
        </nav>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="login-page">
        <div className="login-card login-card--centered">
          <p className="login-subtitle">Завантаження...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
