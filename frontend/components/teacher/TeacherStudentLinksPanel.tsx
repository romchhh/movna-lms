'use client'

import { AddButtonLabel } from '@/components/shared/AddButtonLabel'
import { Empty } from '@/components/shared/UI'
import { detectStudentLinkType, linkTypeHint } from '@/lib/detect-link-type'
import {
  LINK_TYPE_LABELS,
  type StudentLinkType,
  teacherStudentLinksApi,
} from '@/lib/teacher-student-links-api'
import { useCallback, useEffect, useRef, useState } from 'react'

interface TeacherStudentLinkModalProps {
  studentOptimateId: string
  studentName: string
  initialType?: StudentLinkType
  onClose: () => void
  onSaved?: () => void
}

export function TeacherStudentLinkModal({
  studentOptimateId,
  studentName,
  initialType = 'lesson',
  onClose,
  onSaved,
}: TeacherStudentLinkModalProps) {
  const [linkType, setLinkType] = useState<StudentLinkType>(initialType)
  const [url, setUrl] = useState('')
  const [label, setLabel] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [autoHint, setAutoHint] = useState<string | null>(null)
  const typeTouched = useRef(false)

  useEffect(() => {
    setLinkType(initialType)
    typeTouched.current = false
    setUrl('')
    setLabel('')
    setAutoHint(null)
  }, [initialType, studentOptimateId])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await teacherStudentLinksApi.get(studentOptimateId)
        if (cancelled) return
        if (initialType === 'custom') return
        const existing = initialType === 'lesson'
          ? data.lesson_link
          : initialType === 'miro'
            ? data.miro_link
            : null
        if (existing) {
          setUrl(existing.url)
          setLabel(existing.label)
          setLinkType(existing.link_type as StudentLinkType)
        }
      } catch {
        // ignore preload errors
      }
    })()
    return () => { cancelled = true }
  }, [studentOptimateId, initialType])

  useEffect(() => {
    if (typeTouched.current || !url.trim()) {
      setAutoHint(null)
      return
    }
    const detected = detectStudentLinkType(url)
    if (detected && detected !== linkType) {
      setLinkType(detected)
    }
    setAutoHint(linkTypeHint(url))
  }, [url, linkType])

  const save = useCallback(async () => {
    setSaving(true)
    setError('')
    try {
      await teacherStudentLinksApi.create({
        student_optimate_id: studentOptimateId,
        link_type: linkType,
        url: url.trim(),
        label: label.trim(),
      })
      onSaved?.()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка збереження')
    } finally {
      setSaving(false)
    }
  }, [studentOptimateId, linkType, url, label, onClose, onSaved])

  const placeholder = linkType === 'lesson'
    ? 'https://zoom.us/j/... або https://meet.google.com/...'
    : linkType === 'miro'
      ? 'https://miro.com/app/board/...'
      : 'https://youtube.com/... або інше посилання'

  return (
    <div className="hw-modal-overlay" onClick={onClose}>
      <div className="hw-modal stc-link-modal" onClick={e => e.stopPropagation()}>
        <div className="stc-wizard-head">
          <h3>Посилання для {studentName}</h3>
          <button type="button" className="sidebar-close" onClick={onClose} aria-label="Закрити">
            <svg viewBox="0 0 24 24" aria-hidden><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        <div className="hw-modal-body">
          {error && <div className="alert">{error}</div>}

          <label className="stc-field">
            <span>Посилання</span>
            <input
              className="input"
              type="url"
              placeholder={placeholder}
              value={url}
              onChange={e => setUrl(e.target.value)}
              autoFocus
            />
          </label>

          {autoHint && (
            <p className="stc-wizard-hint stc-wizard-hint--auto">{autoHint}</p>
          )}

          <label className="stc-field">
            <span>Тип посилання</span>
            <select
              className="input"
              value={linkType}
              onChange={e => {
                typeTouched.current = true
                setLinkType(e.target.value as StudentLinkType)
                setAutoHint(null)
              }}
            >
              {(Object.keys(LINK_TYPE_LABELS) as StudentLinkType[]).map(key => (
                <option key={key} value={key}>{LINK_TYPE_LABELS[key]}</option>
              ))}
            </select>
          </label>

          {linkType === 'custom' && (
            <label className="stc-field">
              <span>Опис посилання</span>
              <input
                className="input"
                placeholder="Напр. Тест з граматики, Відео на YouTube"
                value={label}
                onChange={e => setLabel(e.target.value)}
              />
            </label>
          )}

          {linkType === 'lesson' && (
            <p className="stc-wizard-hint">
              Zoom, Google Meet або інша платформа — учень побачить посилання в кабінеті та перед уроком.
            </p>
          )}
          {linkType === 'miro' && (
            <p className="stc-wizard-hint">
              Дошка Miro для цього учня — зʼявиться в кабінеті студента та в нагадуванні про урок.
            </p>
          )}
          {linkType === 'custom' && (
            <p className="stc-wizard-hint">
              Будь-яке посилання для навчання: тест, відео, документ. Учень побачить його в розділі матеріалів.
            </p>
          )}
        </div>

        <div className="hw-modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Скасувати</button>
          <button
            type="button"
            className="btn btn-teal"
            disabled={saving || !url.trim() || (linkType === 'custom' && !label.trim())}
            onClick={save}
          >
            {saving ? 'Збереження…' : 'Зберегти'}
          </button>
        </div>
      </div>
    </div>
  )
}

interface TeacherStudentLinksPanelProps {
  studentOptimateId: string
  studentName: string
}

export function TeacherStudentLinksPanel({
  studentOptimateId,
  studentName,
}: TeacherStudentLinksPanelProps) {
  const [data, setData] = useState<Awaited<ReturnType<typeof teacherStudentLinksApi.get>> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalType, setModalType] = useState<StudentLinkType | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData(await teacherStudentLinksApi.get(studentOptimateId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка')
    } finally {
      setLoading(false)
    }
  }, [studentOptimateId])

  useEffect(() => {
    load()
  }, [load])

  async function removeLink(id: number) {
    try {
      await teacherStudentLinksApi.remove(id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка видалення')
    }
  }

  return (
    <section className="stc-panel stc-links-panel">
      <div className="stc-panel-head">
        <div>
          <h3>Посилання для навчання</h3>
          <p className="stc-panel-sub">Урок, Miro та додаткові матеріали — учень бачить у своєму кабінеті</p>
        </div>
        <button type="button" className="btn btn-sm btn-teal" onClick={() => setModalType('custom')}>
          <AddButtonLabel>Додати посилання</AddButtonLabel>
        </button>
      </div>

      {error && <div className="alert">{error}</div>}
      {loading && <Empty label="Завантаження посилань…" />}

      {!loading && data && (
        <div className="stc-links-list">
          <div className="stc-link-row">
            <div>
              <div className="stc-link-type">{LINK_TYPE_LABELS.lesson}</div>
              <div className="stc-link-url">{data.lesson_link?.url || '—'}</div>
            </div>
            <button type="button" className="btn btn-sm btn-secondary" onClick={() => setModalType('lesson')}>
              {data.lesson_link ? 'Змінити' : 'Додати'}
            </button>
          </div>

          <div className="stc-link-row">
            <div>
              <div className="stc-link-type">{LINK_TYPE_LABELS.miro}</div>
              <div className="stc-link-url">{data.miro_link?.url || '—'}</div>
            </div>
            <button type="button" className="btn btn-sm btn-secondary" onClick={() => setModalType('miro')}>
              {data.miro_link ? 'Змінити' : 'Додати'}
            </button>
          </div>

          {data.custom_links.length > 0 && (
            <div className="stc-custom-links">
              <div className="stc-link-type">{LINK_TYPE_LABELS.custom}</div>
              {data.custom_links.map(link => (
                <div key={link.id} className="stc-link-row stc-link-row--custom">
                  <div>
                    <div className="stc-link-label">{link.label || 'Без опису'}</div>
                    <div className="stc-link-url">{link.url}</div>
                  </div>
                  <button type="button" className="btn btn-sm btn-secondary" onClick={() => removeLink(link.id)}>
                    Видалити
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {modalType && (
        <TeacherStudentLinkModal
          studentOptimateId={studentOptimateId}
          studentName={studentName}
          initialType={modalType}
          onClose={() => setModalType(null)}
          onSaved={load}
        />
      )}
    </section>
  )
}
