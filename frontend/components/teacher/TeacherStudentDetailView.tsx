'use client'

import { OptimateStudentProfileSections } from '@/components/admin/OptimateStudentProfileSections'
import { TeacherStudentHomeworkPanel } from '@/components/teacher/TeacherStudentHomeworkPanel'
import { TeacherStudentLessonsPanel } from '@/components/teacher/TeacherStudentLessonsPanel'
import { TeacherStudentLinkModal } from '@/components/teacher/TeacherStudentLinksPanel'
import { TeacherStudentQuickLinks } from '@/components/teacher/TeacherStudentQuickLinks'
import { TeacherStudentSettingsPanels } from '@/components/teacher/TeacherStudentSettingsMenu'
import { RefreshIcon } from '@/components/shared/Icons'
import { ProgressBar, StatCard } from '@/components/shared/UI'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { useLmsProfile } from '@/hooks/useLmsProfiles'
import { studentDisplayName } from '@/lib/person-display-name'
import { teacherStudentCurriculumApi } from '@/lib/student-curriculum-api'
import { teacherOptimateApi } from '@/lib/teacher-optimate-api'
import type { StudentLinkType } from '@/lib/teacher-student-links-api'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

interface TeacherStudentDetailViewProps {
  studentId: string
  fallbackName?: string
}

export function TeacherStudentDetailView({ studentId, fallbackName }: TeacherStudentDetailViewProps) {
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [linkModalType, setLinkModalType] = useState<StudentLinkType | null>(null)
  const [curriculumPct, setCurriculumPct] = useState<number | null>(null)
  const [curriculumTitle, setCurriculumTitle] = useState<string | null>(null)
  const [curriculumDone, setCurriculumDone] = useState<string | null>(null)

  const { profile: lmsProfile } = useLmsProfile(studentId)

  const load = useCallback(async (refresh = false) => {
    setLoading(true)
    setError('')
    try {
      const [res, curriculum] = await Promise.all([
        teacherOptimateApi.studentDetail(studentId, refresh),
        teacherStudentCurriculumApi.getStudent(studentId).catch(() => null),
      ])
      setDetail(res.data)
      if (curriculum?.active) {
        setCurriculumPct(curriculum.active.progress_pct)
        setCurriculumTitle(curriculum.active.program_title)
        setCurriculumDone(`${curriculum.active.completed_slots}/${curriculum.active.total_slots}`)
      } else {
        setCurriculumPct(null)
        setCurriculumTitle(null)
        setCurriculumDone(null)
      }
    } catch (err) {
      setDetail(null)
      setError(err instanceof Error ? err.message : 'Помилка')
    } finally {
      setLoading(false)
    }
  }, [studentId])

  useEffect(() => {
    load()
  }, [load])

  const displayName = studentDisplayName(detail, fallbackName || 'Учень')
  const chatUrl = detail?.chat_url ? String(detail.chat_url) : null
  const lessonsTotal = Number(detail?.lessons_total ?? 0)
  const lessonsUsed = Number(detail?.lessons_used ?? 0)
  const balancePct = lessonsTotal > 0 ? Math.round((lessonsUsed / lessonsTotal) * 100) : 0

  return (
    <div className="teacher-student-page">
      <div className="teacher-student-page-top">
        <Link href="/teacher/students" className="teacher-student-back">
          ← Мої учні
        </Link>
        <button
          type="button"
          className="btn btn-sm btn-secondary teacher-student-refresh"
          disabled={loading}
          onClick={() => load(true)}
        >
          <RefreshIcon className="teacher-student-refresh-icon" /> Оновити з Optimate
        </button>
      </div>

      <header className="teacher-student-page-hero">
        <UserAvatar
          name={displayName}
          optimateId={studentId}
          avatarUrl={lmsProfile?.avatar_url}
          size="xl"
          kind="student"
        />
        <div className="teacher-student-page-hero-text">
          <span className="optimate-modal-entity-hero-label">Учень</span>
          <h1 className="teacher-student-page-name">{displayName}</h1>
          {detail && (
            <p className="teacher-student-page-sub">
              {String(detail.skill_level_label || '—')}
              {' · '}
              ID {String(detail.id ?? studentId)}
              {curriculumTitle ? ` · ${curriculumTitle}` : ''}
            </p>
          )}
          {(curriculumPct != null || lessonsTotal > 0) && (
            <div className="teacher-student-hero-progress">
              {curriculumPct != null && (
                <div className="teacher-student-hero-progress-item">
                  <div className="teacher-student-hero-progress-label">
                    <span>Прогрес програми</span>
                    <strong>{curriculumPct}%{curriculumDone ? ` · ${curriculumDone}` : ''}</strong>
                  </div>
                  <ProgressBar pct={curriculumPct} color="var(--t)" />
                </div>
              )}
              {lessonsTotal > 0 && (
                <div className="teacher-student-hero-progress-item">
                  <div className="teacher-student-hero-progress-label">
                    <span>Використання пакету</span>
                    <strong>{lessonsUsed}/{lessonsTotal} ({balancePct}%)</strong>
                  </div>
                  <ProgressBar pct={balancePct} color="var(--p, var(--t))" />
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {error && <div className="alert">{error}</div>}
      {loading && !detail && <p className="teacher-student-loading">Завантаження профілю учня…</p>}

      {detail && (
        <>
          <div className="teacher-student-stats g4">
            <StatCard
              label="Залишок уроків"
              value={String(detail.remaining_lessons ?? 0)}
              danger={Number(detail.remaining_lessons ?? 0) <= 2}
            />
            <StatCard label="Заплановано" value={String(detail.planned_lessons ?? 0)} />
            <StatCard label="Проведено" value={String(detail.completed_lessons ?? 0)} />
            <StatCard
              label="Прогрес програми"
              value={curriculumPct != null ? `${curriculumPct}%` : '—'}
              sub={curriculumDone ?? 'не призначено'}
            />
          </div>

          <TeacherStudentQuickLinks
            studentOptimateId={studentId}
            chatUrl={chatUrl}
            onEditLesson={() => setLinkModalType('lesson')}
            onEditMiro={() => setLinkModalType('miro')}
          />

          <div className="teacher-student-page-layout">
            <div className="teacher-student-page-main">
              <TeacherStudentLessonsPanel
                studentOptimateId={studentId}
                studentName={displayName}
              />
              <TeacherStudentSettingsPanels
                studentOptimateId={studentId}
                studentName={displayName}
              />
              <TeacherStudentHomeworkPanel
                studentOptimateId={studentId}
                studentName={displayName}
              />
            </div>

            <aside className="teacher-student-page-side">
              <div className="teacher-student-profile-card">
                <OptimateStudentProfileSections
                  data={detail}
                  entityId={studentId}
                  audience="teacher"
                  showNotes
                />
              </div>
            </aside>
          </div>
        </>
      )}

      {linkModalType && (
        <TeacherStudentLinkModal
          studentOptimateId={studentId}
          studentName={displayName}
          initialType={linkModalType}
          onClose={() => setLinkModalType(null)}
        />
      )}
    </div>
  )
}
