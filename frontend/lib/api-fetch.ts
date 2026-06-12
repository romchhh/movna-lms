import { clearAuthTokens, getToken } from './auth'

export interface ApiFetchOptions {
  /** Default message when `detail` is not a string. */
  errorMessage?: string
  /** Redirect to login on expired session (admin client). */
  redirectOnInvalidSession?: boolean
}

function parseErrorDetail(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'detail' in body) {
    const detail = (body as { detail?: unknown }).detail
    if (typeof detail === 'string') return detail
  }
  return fallback
}

function maybeRedirectOnInvalidSession(message: string, enabled?: boolean) {
  if (!enabled || typeof document === 'undefined') return
  if (message !== 'Invalid token' && message !== 'User not found') return

  clearAuthTokens()
  const hint =
    message === 'Invalid token'
      ? 'Сесія недійсна. Увійдіть знову (на сервері має бути стабільний SECRET_KEY).'
      : 'Користувача не знайдено. Запустіть seed.py на сервері або увійдіть знову.'
  window.location.href = `/auth/login?error=${encodeURIComponent(hint)}`
}

/** Append `refresh=true` for Optimate cache-bypass. */
export function withRefreshQuery(path: string, refresh?: boolean): string {
  if (!refresh) return path
  return `${path}${path.includes('?') ? '&' : '?'}refresh=true`
}

/** Authenticated JSON (or FormData) fetch for portal API routes. */
export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
  options: ApiFetchOptions = {},
): Promise<T> {
  const token = getToken()
  if (!token) throw new Error('Не авторизовано')

  const isFormData = init?.body instanceof FormData
  const res = await fetch(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body && !isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers as Record<string, string> | undefined),
    },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    const message = parseErrorDetail(err, options.errorMessage ?? 'Помилка')
    maybeRedirectOnInvalidSession(message, options.redirectOnInvalidSession)
    throw new Error(message)
  }

  if (res.status === 204) return undefined as T
  return res.json()
}
