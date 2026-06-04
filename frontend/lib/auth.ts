'use client'

export function getToken(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(?:^|; )token=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : null
}

export function setToken(token: string) {
  document.cookie = `token=${encodeURIComponent(token)}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`
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
