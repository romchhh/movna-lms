'use client'

import { IconButton, MoreIcon } from '@/components/shared/Icons'
import { TeacherStudentCurriculumPanel } from '@/components/curriculum/TeacherStudentCurriculumPanel'
import { TeacherStudentLinksPanel } from '@/components/teacher/TeacherStudentLinksPanel'

interface TeacherStudentSettingsButtonProps {
  open: boolean
  onToggle: () => void
}

export function TeacherStudentSettingsButton({ open, onToggle }: TeacherStudentSettingsButtonProps) {
  return (
    <IconButton
      label={open ? 'Згорнути налаштування' : 'Налаштування учня'}
      variant="ghost"
      className={`app-modal-icon-btn${open ? ' app-modal-icon-btn--active' : ''}`}
      onClick={onToggle}
      aria-expanded={open}
    >
      <MoreIcon />
    </IconButton>
  )
}

interface TeacherStudentSettingsPanelsProps {
  studentOptimateId: string
  studentName: string
}

export function TeacherStudentSettingsPanels({
  studentOptimateId,
  studentName,
}: TeacherStudentSettingsPanelsProps) {
  return (
    <div className="optimate-student-settings">
      <TeacherStudentLinksPanel
        studentOptimateId={studentOptimateId}
        studentName={studentName}
      />
      <TeacherStudentCurriculumPanel
        studentOptimateId={studentOptimateId}
        studentName={studentName}
      />
    </div>
  )
}
