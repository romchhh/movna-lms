/** Shared Optimate / portal API types. */

export interface CacheMeta {
  cached: boolean
  synced_at: string
}

export interface LessonFormatBreakdown {
  individual: number
  group: number
  pair: number
  speaking_club: number
}

/** Alias used by FormatBreakdownBar. */
export type FormatBreakdown = LessonFormatBreakdown

export interface WeekActivityDay {
  day: string
  label: string
  total: number
  completed: number
  planned: number
}

export interface Paginated<T> {
  data: T[]
  total: number
  page: number
  page_size: number
  cache: CacheMeta
}
