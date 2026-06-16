'use client'

import { CurriculumBrowser } from '@/components/curriculum/CurriculumBrowser'

export default function AdminCurriculaPage() {
  return <CurriculumBrowser audience="admin" canRefresh />
}
