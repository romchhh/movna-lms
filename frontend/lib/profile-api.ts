import { apiFetch } from './api-fetch'
import { getToken } from './auth'
import { withAvatarCacheBust } from './avatar-crop'

export interface LmsProfile {
  optimate_id: string
  full_name: string
  avatar_url: string
  about_me: string
  role: string
}

export const LMS_PROFILE_UPDATED_EVENT = 'movna:lms-profile-updated'

export function notifyLmsProfileUpdated(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(LMS_PROFILE_UPDATED_EVENT))
  }
}

export const profileApi = {
  me() {
    return apiFetch<LmsProfile>('/api/profile/me')
  },
  updateMe(payload: { about_me?: string }) {
    return apiFetch<LmsProfile>('/api/profile/me', {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },
  lookup(optimateIds: string[]) {
    const ids = [...new Set(optimateIds.filter(Boolean))]
    if (!ids.length) return Promise.resolve({ profiles: {} as Record<string, LmsProfile> })
    return apiFetch<{ profiles: Record<string, LmsProfile> }>('/api/profile/lookup', {
      method: 'POST',
      body: JSON.stringify({ optimate_ids: ids }),
    })
  },
  async uploadAvatar(file: File): Promise<LmsProfile> {
    const token = getToken()
    if (!token) throw new Error('Не авторизовано')
    const form = new FormData()
    form.append('file', file)
    const res = await fetch('/api/profile/avatar', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }))
      throw new Error(typeof err.detail === 'string' ? err.detail : 'Помилка завантаження')
    }
    const data = await res.json()
    if (data.avatar_url) {
      data.avatar_url = withAvatarCacheBust(data.avatar_url)
    }
    notifyLmsProfileUpdated()
    return data
  },
  async removeAvatar(): Promise<LmsProfile> {
    const data = await apiFetch<LmsProfile>('/api/profile/avatar', { method: 'DELETE' })
    notifyLmsProfileUpdated()
    return data
  },
}

const profileCache = new Map<string, LmsProfile>()

export function getCachedLmsProfile(optimateId: string): LmsProfile | undefined {
  return profileCache.get(optimateId)
}

export function primeLmsProfileCache(profiles: Record<string, LmsProfile>): void {
  for (const [id, profile] of Object.entries(profiles)) {
    profileCache.set(id, profile)
  }
}

export async function fetchLmsProfiles(optimateIds: string[]): Promise<Map<string, LmsProfile>> {
  const ids = [...new Set(optimateIds.filter(Boolean))]
  const missing = ids.filter(id => !profileCache.has(id))
  if (missing.length) {
    const res = await profileApi.lookup(missing)
    primeLmsProfileCache(res.profiles)
  }
  const out = new Map<string, LmsProfile>()
  for (const id of ids) {
    const p = profileCache.get(id)
    if (p) out.set(id, p)
  }
  return out
}

export function clearLmsProfileCache(): void {
  profileCache.clear()
}

export function personInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?'
}
