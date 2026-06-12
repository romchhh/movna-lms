'use client'

const REMEMBER_FLAG = 'movna_remember_me'
const REFRESH_KEY = 'movna_refresh_token'
const CREDENTIALS_KEY = 'movna_saved_login'

const SESSION_DAY = 60 * 60 * 24
const SESSION_MONTH = SESSION_DAY * 30

export function getToken(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(?:^|; )token=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : null
}

export function setToken(token: string, rememberMe = true) {
  const maxAge = rememberMe ? SESSION_MONTH : SESSION_DAY
  document.cookie = `token=${encodeURIComponent(token)}; path=/; max-age=${maxAge}; SameSite=Lax`
}

export function clearToken() {
  document.cookie = 'token=; path=/; max-age=0'
}

export function decodePayload(token: string): { sub: string; role: string; exp: number } | null {
  try {
    const [, b64] = token.split('.')
    return JSON.parse(atob(b64.replace(/-/g, '+').replace(/_/g, '/')))
  } catch {
    return null
  }
}

export function isTokenExpired(token: string): boolean {
  const p = decodePayload(token)
  if (!p) return true
  return Date.now() / 1000 > p.exp
}

export function homeForRole(role: string): string {
  if (role === 'admin') return '/admin'
  if (role === 'teacher') return '/teacher'
  return '/student'
}

export function isRememberMe(): boolean {
  if (typeof localStorage === 'undefined') return false
  return localStorage.getItem(REMEMBER_FLAG) === '1'
}

export function saveLoginCredentials(email: string, password: string, rememberMe: boolean) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(REMEMBER_FLAG, rememberMe ? '1' : '0')
  if (rememberMe) {
    localStorage.setItem(CREDENTIALS_KEY, JSON.stringify({ email, password }))
  } else {
    localStorage.removeItem(CREDENTIALS_KEY)
  }
}

export function loadLoginCredentials(): { email: string; password: string } | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(CREDENTIALS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { email?: string; password?: string }
    if (!parsed.email) return null
    return { email: parsed.email, password: parsed.password ?? '' }
  } catch {
    return null
  }
}

export function setSession(
  accessToken: string,
  refreshToken: string,
  rememberMe: boolean,
) {
  setToken(accessToken, rememberMe)
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(REMEMBER_FLAG, rememberMe ? '1' : '0')
  if (rememberMe) {
    localStorage.setItem(REFRESH_KEY, refreshToken)
  } else {
    localStorage.removeItem(REFRESH_KEY)
  }
}

export function clearAuthTokens() {
  clearToken()
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(REFRESH_KEY)
}

export function clearSession() {
  clearAuthTokens()
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(REMEMBER_FLAG)
  localStorage.removeItem(CREDENTIALS_KEY)
}

export async function refreshAccessToken(): Promise<boolean> {
  if (typeof localStorage === 'undefined') return false
  const refresh = localStorage.getItem(REFRESH_KEY)
  if (!refresh) return false

  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refresh }),
    })
    if (!res.ok) return false
    const data = await res.json()
    setSession(data.access_token, data.refresh_token, true)
    return true
  } catch {
    return false
  }
}

export async function ensureValidSession(): Promise<boolean> {
  const token = getToken()
  if (token && !isTokenExpired(token)) return true
  if (!isRememberMe()) return false
  return refreshAccessToken()
}
