import { apiFetch } from './api-fetch'

export type FaqAudience = 'all' | 'student' | 'teacher'

export interface FaqPublicItem {
  id: number
  question: string
  answer_md: string
  audience: FaqAudience
}

export interface FaqItem extends FaqPublicItem {
  sort_order: number
  is_published: boolean
  created_at: string
  updated_at: string
}

const AUDIENCE_LABELS: Record<FaqAudience, string> = {
  all: 'Усі',
  student: 'Учні',
  teacher: 'Викладачі',
}

export function faqAudienceLabel(audience: FaqAudience): string {
  return AUDIENCE_LABELS[audience]
}

export const faqApi = {
  list(): Promise<{ items: FaqPublicItem[] }> {
    return apiFetch('/api/faq')
  },

  adminList(): Promise<{ items: FaqItem[] }> {
    return apiFetch('/api/admin/faq', undefined, { redirectOnInvalidSession: true })
  },

  create(body: {
    question: string
    answer_md: string
    audience: FaqAudience
    is_published: boolean
  }): Promise<FaqItem> {
    return apiFetch('/api/admin/faq', {
      method: 'POST',
      body: JSON.stringify(body),
    }, { redirectOnInvalidSession: true })
  },

  update(
    id: number,
    body: Partial<{
      question: string
      answer_md: string
      audience: FaqAudience
      is_published: boolean
      sort_order: number
    }>,
  ): Promise<FaqItem> {
    return apiFetch(`/api/admin/faq/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }, { redirectOnInvalidSession: true })
  },

  delete(id: number): Promise<void> {
    return apiFetch(`/api/admin/faq/${id}`, { method: 'DELETE' }, { redirectOnInvalidSession: true })
  },

  reorder(ids: number[]): Promise<{ items: FaqItem[] }> {
    return apiFetch('/api/admin/faq/reorder', {
      method: 'PUT',
      body: JSON.stringify({ ids }),
    }, { redirectOnInvalidSession: true })
  },
}
