'use client'

import { CurriculumBrowser } from '@/components/curriculum/CurriculumBrowser'
import { TeacherCustomCurriculumHub } from '@/components/curriculum/TeacherCustomCurriculumHub'
import { useState } from 'react'

type TeacherCurriculaTab = 'movna' | 'custom'

export default function TeacherCurriculaPage() {
  const [tab, setTab] = useState<TeacherCurriculaTab>('movna')

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

      {tab === 'movna' ? (
        <CurriculumBrowser audience="teacher" />
      ) : (
        <TeacherCustomCurriculumHub />
      )}
    </div>
  )
}
