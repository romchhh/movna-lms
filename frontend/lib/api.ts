const BASE = process.env.NEXT_PUBLIC_API_URL || ''

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, { ...options, headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? 'Request failed')
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (data: object) =>
    request('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  me: (token: string) => request('/api/users/me', {}, token),

  // Courses
  courseProgress: (id: number, token: string) => request(`/api/courses/${id}/progress`, {}, token),
  completeLesson: (courseId: number, lessonId: number, token: string) =>
    request(`/api/courses/${courseId}/lessons/${lessonId}/complete`, { method: 'POST' }, token),

  // Homework
  myHomework: (token: string) => request('/api/homework/my', {}, token),
  submitHomework: (data: object, token: string) =>
    request('/api/homework/submit', { method: 'POST', body: JSON.stringify(data) }, token),
  hwToReview: (token: string) => request('/api/homework/to-review', {}, token),
  reviewHomework: (id: number, data: object, token: string) =>
    request(`/api/homework/${id}/review`, { method: 'POST', body: JSON.stringify(data) }, token),

  // Schedule & balance
  mySchedule: (token: string) => request('/api/schedule/my', {}, token),
  myBalance: (token: string) => request('/api/schedule/balance', {}, token),

  // Admin
  adminStats: (token: string) => request('/api/admin/stats', {}, token),
  adminUsers: (token: string, role?: string) =>
    request(`/api/admin/users${role ? `?role=${role}` : ''}`, {}, token),
}
