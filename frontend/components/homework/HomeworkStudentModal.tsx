'use client'

import { HomeworkFileLink } from '@/components/homework/HomeworkFileLink'
import { MarkdownView } from '@/components/homework/MarkdownView'
import { SimpleAnswerField } from '@/components/homework/SimpleAnswerField'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Badge } from '@/components/shared/UI'
import { AppModalHeader } from '@/components/shared/AppModalHeader'
import { useHomeworkModal } from '@/hooks/useHomeworkModal'
import {
  formatHomeworkDeadline,
  HOMEWORK_STUDENT_STATUS_LABELS,
  homeworkApi,
  isHomeworkOverdue,
  type HomeworkStudentItem,
} from '@/lib/homework-api'
import { homeworkStatusMeta } from '@/lib/status-ui'
import { filenameFromHomeworkUrl } from '@/lib/homework-file-utils'
import { useEffect, useState } from 'react'

interface HomeworkStudentModalProps {
  submissionId: number | null
  initial?: HomeworkStudentItem | null
  onClose: () => void
  onUpdated: () => void
}

export function HomeworkStudentModal({ submissionId, initial, onClose, onUpdated }: HomeworkStudentModalProps) {
  const [item, setItem] = useState<HomeworkStudentItem | null>(initial ?? null)
  const [answer, setAnswer] = useState('')
  const [fileUrl, setFileUrl] = useState('')
  const [fileName, setFileName] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const open = Boolean(submissionId)
  useHomeworkModal(open, onClose)

  useEffect(() => {
    if (!submissionId) return
    setSuccess('')
    setLoading(true)
    setError('')
    homeworkApi.myDetail(submissionId)
      .then(res => {
        setItem(res)
        setAnswer(res.student_answer_md)
        setFileUrl(res.student_file_url)
        setFileName(res.student_file_url ? filenameFromHomeworkUrl(res.student_file_url) : '')
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Помилка'))
      .finally(() => setLoading(false))
  }, [submissionId])

  async function uploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const att = await homeworkApi.upload(file)
      setFileUrl(att.url)
      setFileName(att.filename)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  function removeFile() {
    setFileUrl('')
    setFileName('')
  }

  async function markComplete() {
    if (!submissionId) return
    if (!answer.trim() && !fileUrl) {
      const ok = window.confirm('Надіслати без тексту та файлу?')
      if (!ok) return
    }
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const res = await homeworkApi.complete(submissionId, {
        student_answer_md: answer,
        student_file_url: fileUrl,
      })
      setItem(res)
      setSuccess('Надіслано викладачу на перевірку')
      onUpdated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка')
    } finally {
      setSaving(false)
    }
  }

  if (!submissionId) return null

  const canEdit = item && item.status !== 'reviewed'
  const isTodo = item && (item.status === 'assigned' || item.status === 'viewed')

  return (
    <div className="hw-modal-overlay" onClick={onClose}>
      <div
        className="hw-modal hw-modal--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hw-student-title"
        onClick={e => e.stopPropagation()}
      >
        <AppModalHeader
          title={item?.title ?? 'Домашнє завдання'}
          titleId="hw-student-title"
          subtitle={
            item ? (
              <span className="hw-modal-sub--inline">
                {item.event_title && `${item.event_title} · `}
                до {formatHomeworkDeadline(item.deadline_at)}
                {isHomeworkOverdue(item.deadline_at, item.status) && (
                  <span className="hw-overdue"> · прострочено</span>
                )}
              </span>
            ) : undefined
          }
          onClose={onClose}
        />

        {item && canEdit && isTodo && (
          <div className="hw-modal-action-banner">
            <StatusBadge
              label={HOMEWORK_STUDENT_STATUS_LABELS[item.status]}
              meta={homeworkStatusMeta(item.status)}
            />
            <span>Напишіть відповідь або прикріпіть файл і натисніть «Надіслати»</span>
          </div>
        )}

        <div className="hw-modal-body">
          {loading && <p>Завантаження…</p>}
          {error && <div className="alert">{error}</div>}
          {success && <div className="student-login-success">{success}</div>}
          {item && (
            <>
              <div className="hw-modal-block">
                <MarkdownView content={item.body_markdown} />
                {item.teacher_attachments.length > 0 && (
                  <div className="hw-attachments">
                    {item.teacher_attachments.map(a => (
                      <HomeworkFileLink key={a.id} url={a.url} label={a.filename} sizeBytes={a.size_bytes} />
                    ))}
                  </div>
                )}
              </div>

              {item.teacher_review_note && (
                <div className="hw-modal-block hw-review-box">
                  <h3 className="hw-section-title">Коментар викладача</h3>
                  <MarkdownView content={item.teacher_review_note} />
                </div>
              )}

              {canEdit && (
                <div className="hw-modal-block hw-modal-block--answer">
                  <h3 className="hw-section-title">Ваша відповідь</h3>
                  <SimpleAnswerField value={answer} onChange={setAnswer} />
                  <div className="hw-upload-field">
                    <label className="btn btn-sm btn-secondary hw-upload-btn">
                      {uploading ? 'Завантаження…' : fileUrl ? 'Замінити файл' : '+ Файл'}
                      <input type="file" hidden onChange={uploadFile} disabled={uploading} />
                    </label>
                    {fileUrl && (
                      <div className="hw-attachment-row">
                        <HomeworkFileLink url={fileUrl} label={fileName} className="hw-file-card--flex" />
                        <button type="button" className="btn btn-sm btn-secondary hw-file-remove" onClick={removeFile}>
                          ×
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!canEdit && (item.student_answer_md || item.student_file_url) && (
                <div className="hw-modal-block">
                  <h3 className="hw-section-title">Ваша відповідь</h3>
                  {item.student_answer_md && <MarkdownView content={item.student_answer_md} />}
                  {item.student_file_url && (
                    <HomeworkFileLink url={item.student_file_url} label={filenameFromHomeworkUrl(item.student_file_url)} />
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {item && canEdit && (
          <div className="hw-modal-footer hw-modal-footer--stack">
            <button type="button" className="btn btn-teal btn-full" onClick={markComplete} disabled={saving}>
              {saving ? 'Надсилання…' : item.status === 'completed' ? 'Оновити відповідь' : 'Надіслати'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
