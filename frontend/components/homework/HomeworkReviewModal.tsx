'use client'

import { HomeworkFileLink } from '@/components/homework/HomeworkFileLink'
import { MarkdownView } from '@/components/homework/MarkdownView'
import { SimpleAnswerField } from '@/components/homework/SimpleAnswerField'
import { CloseIcon, IconButton } from '@/components/shared/Icons'
import { useHomeworkModal } from '@/hooks/useHomeworkModal'
import { homeworkApi, type HomeworkSubmission } from '@/lib/homework-api'
import { useState } from 'react'

interface HomeworkReviewModalProps {
  submission: HomeworkSubmission
  onClose: () => void
  onReviewed: () => void
}

export function HomeworkReviewModal({ submission, onClose, onReviewed }: HomeworkReviewModalProps) {
  const [note, setNote] = useState(submission.teacher_review_note || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useHomeworkModal(true, onClose)

  async function submit() {
    setSaving(true)
    setError('')
    try {
      await homeworkApi.review(submission.id, note)
      onReviewed()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка')
    } finally {
      setSaving(false)
    }
  }

  const hasAnswer = Boolean(submission.student_answer_md?.trim() || submission.student_file_url)

  return (
    <div className="hw-modal-overlay" onClick={onClose}>
      <div
        className="hw-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hw-review-title"
        onClick={e => e.stopPropagation()}
      >
        <div className="hw-modal-header">
          <h2 id="hw-review-title">{submission.student_name}</h2>
          <IconButton label="Закрити" onClick={onClose}><CloseIcon /></IconButton>
        </div>
        <div className="hw-modal-body">
          {error && <div className="alert">{error}</div>}
          {!hasAnswer && (
            <p className="hw-modal-hint">Учень позначив завдання виконаним без вкладень</p>
          )}
          {submission.student_answer_md && (
            <div className="hw-modal-block">
              <MarkdownView content={submission.student_answer_md} />
            </div>
          )}
          {submission.student_file_url && (
            <HomeworkFileLink url={submission.student_file_url} label={submission.student_file_url} />
          )}
          <div className="hw-modal-block" style={{ marginTop: 16 }}>
            <h3 className="hw-section-title">Коментар (необовʼязково)</h3>
            <SimpleAnswerField
              value={note}
              onChange={setNote}
              placeholder="Що вдалося, що покращити…"
              minRows={4}
            />
          </div>
        </div>
        <div className="hw-modal-footer hw-modal-footer--stack">
          <button type="button" className="btn btn-teal btn-full" onClick={submit} disabled={saving}>
            {saving ? 'Збереження…' : 'Готово, перевірено'}
          </button>
          <button type="button" className="btn btn-secondary btn-full" onClick={onClose}>
            Скасувати
          </button>
        </div>
      </div>
    </div>
  )
}
