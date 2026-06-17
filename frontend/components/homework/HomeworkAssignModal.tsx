'use client'

import { HomeworkFileLink } from '@/components/homework/HomeworkFileLink'
import { MarkdownEditor } from '@/components/homework/MarkdownEditor'
import { AppModalHeader } from '@/components/shared/AppModalHeader'
import { AddButtonLabel } from '@/components/shared/AddButtonLabel'
import type { CalendarEvent } from '@/lib/calendar-types'
import {
  homeworkApi,
  type HomeworkAssignment,
  type HomeworkAttachment,
  type HomeworkStudentRef,
} from '@/lib/homework-api'
import { useEffect, useState } from 'react'

interface HomeworkAssignModalProps {
  event: CalendarEvent
  existing: HomeworkAssignment | null
  onClose: () => void
  onSaved: () => void
  /** Якщо задано — призначити лише цим учням (наприклад, один учень з майстра). */
  studentsOverride?: HomeworkStudentRef[]
  onBack?: () => void
}

function toLocalDeadline(iso?: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function defaultDeadlineFromEvent(event: CalendarEvent): string {
  const base = new Date(event.ends_at || event.starts_at)
  if (Number.isNaN(base.getTime())) return ''
  base.setDate(base.getDate() + 7)
  return toLocalDeadline(base.toISOString())
}

export function HomeworkAssignModal({
  event,
  existing,
  onClose,
  onSaved,
  studentsOverride,
  onBack,
}: HomeworkAssignModalProps) {
  const [title, setTitle] = useState(existing?.title ?? event.title)
  const [body, setBody] = useState(existing?.body_markdown ?? '')
  const [deadline, setDeadline] = useState(
    existing?.deadline_at ? toLocalDeadline(existing.deadline_at) : defaultDeadlineFromEvent(event),
  )
  const [attachments, setAttachments] = useState<HomeworkAttachment[]>(existing?.teacher_attachments ?? [])
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setTitle(existing?.title ?? event.title)
    setBody(existing?.body_markdown ?? '')
    setDeadline(
      existing?.deadline_at ? toLocalDeadline(existing.deadline_at) : defaultDeadlineFromEvent(event),
    )
    setAttachments(existing?.teacher_attachments ?? [])
    setError('')
  }, [existing, event.id])

  const students = studentsOverride ?? (() => {
    const fromParts = (event.students ?? []).filter(s => s.id).map(s => ({
      optimate_id: s.id,
      name: s.name,
    }))
    if (fromParts.length) return fromParts
    const ids = event.student_ids ?? []
    const names = event.student_names ?? []
    return ids.map((id, i) => ({ optimate_id: id, name: names[i] ?? '' })).filter(s => s.optimate_id)
  })()

  async function onFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const att = await homeworkApi.upload(file)
      setAttachments(prev => [...prev, att])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка завантаження')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function save() {
    if (!body.trim()) {
      setError('Додайте текст завдання')
      return
    }
    if (!students.length) {
      setError('Урок без учнів — неможливо призначити ДЗ')
      return
    }
    setSaving(true)
    setError('')
    try {
      await homeworkApi.saveAssignment({
        optimate_event_id: event.id,
        title,
        body_markdown: body,
        deadline_at: deadline ? new Date(deadline).toISOString() : null,
        teacher_attachments: attachments,
        event_starts_at: event.starts_at,
        event_ends_at: event.ends_at,
        event_title: event.title,
        students,
      })
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="hw-modal-overlay" onClick={onClose}>
      <div className="hw-modal hw-modal--wide" onClick={e => e.stopPropagation()}>
        <AppModalHeader
          title={existing ? 'Редагувати ДЗ' : 'Додати ДЗ'}
          subtitle={`${event.title} · ${students.map(s => s.name).join(', ')}`}
          onClose={onClose}
        />
        <div className="hw-modal-body">
          {error && <div className="alert">{error}</div>}

          <label className="hw-field">
            <span>Назва</span>
            <input className="input" value={title} onChange={e => setTitle(e.target.value)} />
          </label>

          <label className="hw-field">
            <span>Текст завдання</span>
            <MarkdownEditor value={body} onChange={setBody} minHeight={220} />
          </label>

          <label className="hw-field">
            <span>Дедлайн</span>
            <input className="input" type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)} />
          </label>

          <div className="hw-field">
            <span>Файли</span>
            <div className="hw-attachments">
              {attachments.map(a => (
                <div key={a.id} className="hw-attachment-row">
                  <HomeworkFileLink url={a.url} label={a.filename} sizeBytes={a.size_bytes} className="hw-file-card--flex" />
                  <button type="button" className="btn btn-sm btn-secondary hw-file-remove" onClick={() => setAttachments(prev => prev.filter(x => x.id !== a.id))}>
                    Видалити
                  </button>
                </div>
              ))}
              <label className="btn btn-sm btn-secondary hw-upload-btn">
                {uploading ? 'Завантаження…' : <AddButtonLabel>Додати файл</AddButtonLabel>}
                <input type="file" hidden onChange={onFilePick} disabled={uploading} />
              </label>
            </div>
          </div>
        </div>
        <div className="hw-modal-footer">
          {onBack ? (
            <button type="button" className="btn btn-secondary" onClick={onBack}>← Назад</button>
          ) : (
            <button type="button" className="btn btn-secondary" onClick={onClose}>Скасувати</button>
          )}
          <button type="button" className="btn btn-teal" onClick={save} disabled={saving}>
            {saving ? 'Збереження…' : 'Зберегти ДЗ'}
          </button>
        </div>
      </div>
    </div>
  )
}
