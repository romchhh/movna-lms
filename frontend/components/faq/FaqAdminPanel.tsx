'use client'

import { MarkdownEditor } from '@/components/homework/MarkdownEditor'
import { ConfirmDialog } from '@/components/lesson-requests/ConfirmDialog'
import { AddButtonLabel } from '@/components/shared/AddButtonLabel'
import { Badge, Card, Empty } from '@/components/shared/UI'
import {
  faqApi,
  faqAudienceLabel,
  type FaqAudience,
  type FaqItem,
} from '@/lib/faq-api'
import { useCallback, useEffect, useState } from 'react'

const AUDIENCES: FaqAudience[] = ['all', 'student', 'teacher']

function emptyDraft(): Omit<FaqItem, 'id' | 'created_at' | 'updated_at' | 'sort_order'> & { sort_order?: number } {
  return {
    question: '',
    answer_md: '',
    audience: 'all',
    is_published: true,
  }
}

export function FaqAdminPanel() {
  const [items, setItems] = useState<FaqItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savingId, setSavingId] = useState<number | 'new' | null>(null)
  const [editingId, setEditingId] = useState<number | 'new' | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [draft, setDraft] = useState(emptyDraft())

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await faqApi.adminList()
      setItems(res.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка завантаження')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  function startCreate() {
    setEditingId('new')
    setDraft(emptyDraft())
  }

  function startEdit(item: FaqItem) {
    setEditingId(item.id)
    setDraft({
      question: item.question,
      answer_md: item.answer_md,
      audience: item.audience,
      is_published: item.is_published,
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setDraft(emptyDraft())
  }

  async function saveDraft() {
    if (!draft.question.trim()) {
      setError('Введіть питання')
      return
    }
    setError('')
    setSavingId(editingId)
    try {
      if (editingId === 'new') {
        await faqApi.create({
          question: draft.question.trim(),
          answer_md: draft.answer_md,
          audience: draft.audience,
          is_published: draft.is_published,
        })
      } else if (editingId !== null) {
        await faqApi.update(editingId, {
          question: draft.question.trim(),
          answer_md: draft.answer_md,
          audience: draft.audience,
          is_published: draft.is_published,
        })
      }
      cancelEdit()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка збереження')
    } finally {
      setSavingId(null)
    }
  }

  async function moveItem(id: number, direction: -1 | 1) {
    const index = items.findIndex(i => i.id === id)
    const target = index + direction
    if (index < 0 || target < 0 || target >= items.length) return
    const next = [...items]
    const [removed] = next.splice(index, 1)
    next.splice(target, 0, removed)
    setItems(next)
    try {
      const res = await faqApi.reorder(next.map(i => i.id))
      setItems(res.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка сортування')
      await load()
    }
  }

  async function togglePublished(item: FaqItem) {
    setSavingId(item.id)
    try {
      const updated = await faqApi.update(item.id, { is_published: !item.is_published })
      setItems(prev => prev.map(i => (i.id === updated.id ? updated : i)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка')
    } finally {
      setSavingId(null)
    }
  }

  async function confirmDelete() {
    if (deleteId === null) return
    setSavingId(deleteId)
    try {
      await faqApi.delete(deleteId)
      setDeleteId(null)
      if (editingId === deleteId) cancelEdit()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка видалення')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <>
      {error && <div className="alert">{error}</div>}

      <div className="faq-admin-toolbar">
        <button type="button" className="btn btn-teal btn-sm" onClick={startCreate} disabled={editingId === 'new'}>
          <AddButtonLabel>Додати питання</AddButtonLabel>
        </button>
      </div>

      {editingId === 'new' && (
        <Card className="faq-admin-editor-card">
          <FaqEditorForm
            draft={draft}
            onChange={setDraft}
            onSave={() => void saveDraft()}
            onCancel={cancelEdit}
            saving={savingId === 'new'}
            title="Нове питання"
          />
        </Card>
      )}

      {loading && <Empty label="Завантаження FAQ…" />}

      {!loading && items.length === 0 && editingId !== 'new' && (
        <Empty label="Записів немає — додайте перше питання" />
      )}

      <div className="faq-admin-list">
        {items.map((item, index) => (
          <Card key={item.id} className={`faq-admin-row${!item.is_published ? ' faq-admin-row--hidden' : ''}`}>
            {editingId === item.id ? (
              <FaqEditorForm
                draft={draft}
                onChange={setDraft}
                onSave={() => void saveDraft()}
                onCancel={cancelEdit}
                saving={savingId === item.id}
                title="Редагування"
              />
            ) : (
              <>
                <div className="faq-admin-row-head">
                  <div className="faq-admin-row-title">{item.question}</div>
                  <div className="faq-admin-row-badges">
                    <Badge variant="gray">{faqAudienceLabel(item.audience)}</Badge>
                    {!item.is_published && <Badge variant="amber">Приховано</Badge>}
                  </div>
                </div>
                <p className="faq-admin-row-preview">
                  {item.answer_md.replace(/<[^>]+>/g, '').slice(0, 160)}
                  {item.answer_md.length > 160 ? '…' : ''}
                </p>
                <div className="faq-admin-row-actions">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => startEdit(item)}>
                    Редагувати
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={index === 0 || savingId === item.id}
                    onClick={() => void moveItem(item.id, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={index === items.length - 1 || savingId === item.id}
                    onClick={() => void moveItem(item.id, 1)}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={savingId === item.id}
                    onClick={() => void togglePublished(item)}
                  >
                    {item.is_published ? 'Сховати' : 'Опублікувати'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={savingId === item.id}
                    onClick={() => setDeleteId(item.id)}
                  >
                    Видалити
                  </button>
                </div>
              </>
            )}
          </Card>
        ))}
      </div>

      <ConfirmDialog
        open={deleteId !== null}
        title="Видалити питання?"
        message="Запис зникне з FAQ для учнів і викладачів."
        confirmLabel="Видалити"
        danger
        loading={savingId !== null}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteId(null)}
      />
    </>
  )
}

function FaqEditorForm({
  draft,
  onChange,
  onSave,
  onCancel,
  saving,
  title,
}: {
  draft: {
    question: string
    answer_md: string
    audience: FaqAudience
    is_published: boolean
  }
  onChange: (next: typeof draft) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
  title: string
}) {
  return (
    <div className="faq-admin-form">
      <div className="faq-admin-form-title">{title}</div>
      <label className="faq-admin-field">
        <span>Питання</span>
        <input
          className="input"
          value={draft.question}
          onChange={e => onChange({ ...draft, question: e.target.value })}
          placeholder="Наприклад: Як увійти в портал?"
        />
      </label>
      <label className="faq-admin-field">
        <span>Відповідь</span>
        <MarkdownEditor
          value={draft.answer_md}
          onChange={answer_md => onChange({ ...draft, answer_md })}
          minHeight={160}
        />
      </label>
      <div className="faq-admin-form-row">
        <label className="faq-admin-field faq-admin-field--inline">
          <span>Аудиторія</span>
          <select
            className="input"
            value={draft.audience}
            onChange={e => onChange({ ...draft, audience: e.target.value as FaqAudience })}
          >
            {AUDIENCES.map(a => (
              <option key={a} value={a}>{faqAudienceLabel(a)}</option>
            ))}
          </select>
        </label>
        <label className="faq-admin-check">
          <input
            type="checkbox"
            checked={draft.is_published}
            onChange={e => onChange({ ...draft, is_published: e.target.checked })}
          />
          Опубліковано
        </label>
      </div>
      <div className="faq-admin-form-actions">
        <button type="button" className="btn btn-teal btn-sm" disabled={saving} onClick={onSave}>
          {saving ? 'Збереження…' : 'Зберегти'}
        </button>
        <button type="button" className="btn btn-secondary btn-sm" disabled={saving} onClick={onCancel}>
          Скасувати
        </button>
      </div>
    </div>
  )
}
