'use client'

import { CurriculumBrowser } from '@/components/curriculum/CurriculumBrowser'
import { TeacherCustomCurriculumHub } from '@/components/curriculum/TeacherCustomCurriculumHub'
import { teacherCurriculumApi } from '@/lib/teacher-curriculum-api'
import { useState } from 'react'

type TeacherCurriculaTab = 'movna' | 'custom'

export interface CustomHubOpenRequest {
  id: number
  mode: 'edit' | 'detail'
  program?: import('@/lib/teacher-curriculum-api').TeacherCurriculumProgram
}

export default function TeacherCurriculaPage() {
  const [tab, setTab] = useState<TeacherCurriculaTab>('movna')
  const [customizingSlug, setCustomizingSlug] = useState<string | null>(null)
  const [customOpen, setCustomOpen] = useState<CustomHubOpenRequest | null>(null)
  const [forkError, setForkError] = useState('')

  async function handleCustomizeMovna(slug: string) {
    setCustomizingSlug(slug)
    setForkError('')
    try {
      const program = await teacherCurriculumApi.forkFromMovna(slug)
      setTab('custom')
      setCustomOpen({ id: program.id, mode: 'edit', program })
    } catch (err) {
      setForkError(err instanceof Error ? err.message : 'Не вдалося створити копію')
    } finally {
      setCustomizingSlug(null)
    }
  }

  return (
    <div className="teacher-curricula-page">
      <div className="curr-page-tabs" role="tablist" aria-label="Навчальні програми">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'movna'}
          className={`curr-page-tab${tab === 'movna' ? ' curr-page-tab--active' : ''}`}
          onClick={() => setTab('movna')}
        >
          Програми Movna
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'custom'}
          className={`curr-page-tab${tab === 'custom' ? ' curr-page-tab--active' : ''}`}
          onClick={() => setTab('custom')}
        >
          Власні програми
        </button>
      </div>

      {forkError && <div className="alert">{forkError}</div>}

      {tab === 'movna' ? (
        <CurriculumBrowser
          audience="teacher"
          onCustomizeMovna={handleCustomizeMovna}
          customizingSlug={customizingSlug}
        />
      ) : (
        <TeacherCustomCurriculumHub
          openRequest={customOpen}
          onOpenRequestConsumed={() => setCustomOpen(null)}
        />
      )}
    </div>
  )
}
