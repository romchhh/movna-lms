'use client'

import { HomeworkAssignModal } from '@/components/homework/HomeworkAssignModal'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Badge, Empty } from '@/components/shared/UI'
import { AppModalHeader } from '@/components/shared/AppModalHeader'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useLmsProfiles } from '@/hooks/useLmsProfiles'
import type { CalendarEvent } from '@/lib/calendar-types'
import { formatEventDateFull, formatTimeRange } from '@/lib/calendar-utils'
import {
  HOMEWORK_STATUS_LABELS,
  homeworkApi,
  type HomeworkAssignment,
  type HomeworkSubmission,
} from '@/lib/homework-api'
import { homeworkStatusMeta } from '@/lib/status-ui'
import { optimateEventToCalendarEvent } from '@/lib/optimate-api'
import { teacherOptimateApi, type TeacherStudent } from '@/lib/teacher-optimate-api'
import { useCallback, useEffect, useMemo, useState } from 'react'

type WizardStep = 'student' | 'lesson'

interface HomeworkCreateWizardProps {
  onClose: () => void
  onSaved: () => void
}

function eventHasStudent(event: CalendarEvent, studentId: string): boolean {
  if (event.student_ids?.includes(studentId)) return true
  return (event.students ?? []).some(s => s.id === studentId)
}

function studentSubmission(
  assignment: HomeworkAssignment | undefined,
  studentId: string,
): HomeworkSubmission | undefined {
  return assignment?.submissions.find(s => s.student_optimate_id === studentId)
}

export function HomeworkCreateWizard({ onClose, onSaved }: HomeworkCreateWizardProps) {
  const [step, setStep] = useState<WizardStep>('student')
  const [studentSearch, setStudentSearch] = useState('')
  const debouncedSearch = useDebouncedValue(studentSearch)
  const [students, setStudents] = useState<TeacherStudent[]>([])
  const [studentsLoading, setStudentsLoading] = useState(true)
  const [eventsLoading, setEventsLoading] = useState(false)
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])
  const [selectedStudent, setSelectedStudent] = useState<TeacherStudent | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [existing, setExisting] = useState<HomeworkAssignment | null>(null)
  const [assignmentsByEvent, setAssignmentsByEvent] = useState<Map<string, HomeworkAssignment>>(new Map())
  const [error, setError] = useState('')

  const loadStudents = useCallback(async () => {
    setStudentsLoading(true)
    setError('')
    try {
      const res = await teacherOptimateApi.students(1, 100, debouncedSearch)
      setStudents(res.data.filter(s => s.status !== 2))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка завантаження учнів')
      setStudents([])
    } finally {
      setStudentsLoading(false)
    }
  }, [debouncedSearch])

  const loadEvents = useCallback(async () => {
    setEventsLoading(true)
    setError('')
    try {
      const [eventsRes, homeworkList] = await Promise.all([
        teacherOptimateApi.events(90, 30),
        homeworkApi.teacherList('all'),
      ])
      setCalendarEvents(eventsRes.data.map(optimateEventToCalendarEvent))
      const byEvent = new Map<string, HomeworkAssignment>()
      for (const assignment of homeworkList) {
        byEvent.set(assignment.optimate_event_id, assignment)
      }
      setAssignmentsByEvent(byEvent)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка завантаження уроків')
      setCalendarEvents([])
      setAssignmentsByEvent(new Map())
    } finally {
      setEventsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStudents()
  }, [loadStudents])

  useEffect(() => {
    if (step === 'lesson' && selectedStudent) {
      loadEvents()
    }
  }, [step, selectedStudent, loadEvents])

  const studentLessons = useMemo(() => {
    if (!selectedStudent) return []
    return calendarEvents
      .filter(e => eventHasStudent(e, selectedStudent.id))
      .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime())
  }, [calendarEvents, selectedStudent])

  function pickStudent(student: TeacherStudent) {
    setSelectedStudent(student)
    setSelectedEvent(null)
    setExisting(null)
    setStep('lesson')
  }

  function pickLesson(event: CalendarEvent) {
    setError('')
    setExisting(assignmentsByEvent.get(event.id) ?? null)
    setSelectedEvent(event)
  }

  function handleSaved() {
    onSaved()
    onClose()
  }

  useLmsProfiles(students.map(s => s.id))

  if (selectedEvent && selectedStudent) {
    return (
      <HomeworkAssignModal
        event={selectedEvent}
        existing={existing}
        studentsOverride={[{ optimate_id: selectedStudent.id, name: selectedStudent.full_name }]}
        onClose={onClose}
        onSaved={handleSaved}
        onBack={() => {
          setSelectedEvent(null)
          setExisting(null)
        }}
      />
    )
  }

  return (
    <div className="hw-modal-overlay" onClick={onClose}>
      <div className="hw-modal hw-modal--wide hw-wizard" onClick={e => e.stopPropagation()}>
        <AppModalHeader
          title="Додати домашнє завдання"
          subtitle={step === 'student' ? 'Оберіть учня' : `Урок · ${selectedStudent?.full_name}`}
          onClose={onClose}
        />

        <div className="hw-modal-body">
          {error && <div className="alert">{error}</div>}

          {step === 'student' && (
            <>
              <input
                className="input"
                placeholder="Пошук учня..."
                value={studentSearch}
                onChange={e => setStudentSearch(e.target.value)}
                autoFocus
              />
              {studentsLoading && <Empty label="Завантаження учнів..." />}
              {!studentsLoading && students.length === 0 && <Empty label="Учнів не знайдено" />}
              <div className="hw-wizard-list">
                {students.map(student => (
                  <button
                    key={student.id}
                    type="button"
                    className="hw-wizard-pick"
                    onClick={() => pickStudent(student)}
                  >
                    <UserAvatar name={student.full_name} optimateId={student.id} size="md" kind="student" />
                    <span className="hw-wizard-pick-body">
                      <span className="admin-table-title">{student.full_name}</span>
                      <span className="admin-table-sub">
                        {student.skill_level_label || '—'} · {student.remaining_lessons} ур. залишилось
                      </span>
                    </span>
                    <span className="hw-wizard-pick-arrow">→</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 'lesson' && selectedStudent && (
            <>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => {
                  setStep('student')
                  setSelectedStudent(null)
                }}
              >
                ← Інший учень
              </button>
              {eventsLoading && <Empty label="Завантаження уроків..." />}
              {!eventsLoading && studentLessons.length === 0 && (
                <Empty label="Уроків з цим учнем не знайдено за останні 90 днів" />
              )}
              <div className="hw-wizard-list">
                {studentLessons.map(event => {
                  const assignment = assignmentsByEvent.get(event.id)
                  const submission = studentSubmission(assignment, selectedStudent.id)
                  const hasHw = Boolean(assignment)
                  return (
                    <button
                      key={event.id}
                      type="button"
                      className={`hw-wizard-pick${hasHw ? ' hw-wizard-pick--has-hw' : ' hw-wizard-pick--no-hw'}`}
                      onClick={() => pickLesson(event)}
                    >
                      <span className="hw-wizard-pick-body">
                        <span className="admin-table-title">{event.title}</span>
                        <span className="admin-table-sub">
                          {formatEventDateFull(event.starts_at)} · {formatTimeRange(event.starts_at, event.ends_at)}
                          {event.status_label ? ` · ${event.status_label}` : ''}
                        </span>
                        {hasHw && assignment?.deadline_at && (
                          <span className="admin-table-sub">
                            Дедлайн ДЗ: {new Date(assignment.deadline_at).toLocaleString('uk-UA')}
                          </span>
                        )}
                      </span>
                      <span className="hw-wizard-pick-badges">
                        <Badge variant="gray">{event.schedule_class_label || 'Урок'}</Badge>
                        {!hasHw ? (
                          <Badge variant="gray">Без ДЗ</Badge>
                        ) : submission ? (
                          <StatusBadge
                            label={HOMEWORK_STATUS_LABELS[submission.status]}
                            meta={homeworkStatusMeta(submission.status)}
                          />
                        ) : (
                          <StatusBadge label="ДЗ · додати учня" variant="amber" emoji="📝" />
                        )}
                      </span>
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
