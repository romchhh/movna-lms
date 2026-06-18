'use client'

import { MeetingLinksChecklist } from '@/components/settings/MeetingLinksChecklist'
import { Card } from '@/components/shared/UI'
import {
  meetingLinksStatus,
  notifyMeetingLinksUpdated,
  teacherMeetingLinksApi,
} from '@/lib/meeting-links-api'
import { useCallback, useEffect, useMemo, useState } from 'react'

export function TeacherMeetingLinksCard() {
  const [zoomUrl, setZoomUrl] = useState('')
  const [miroUrl, setMiroUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const status = useMemo(
    () => meetingLinksStatus({ zoom_url: zoomUrl, miro_url: miroUrl }),
    [zoomUrl, miroUrl],
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await teacherMeetingLinksApi.get()
      setZoomUrl(data.zoom_url)
      setMiroUrl(data.miro_url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function save() {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const payload = { zoom_url: zoomUrl.trim(), miro_url: miroUrl.trim() }
      await teacherMeetingLinksApi.update(payload)
      setZoomUrl(payload.zoom_url)
      setMiroUrl(payload.miro_url)
      notifyMeetingLinksUpdated()
      const savedStatus = meetingLinksStatus(payload)
      setSuccess(savedStatus.complete ? 'Посилання збережено' : 'Збережено. Додайте решту посилань нижче.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div id="meeting-links" className="meeting-links-anchor">
      <Card
        title="Посилання на уроки"
        className={status.complete ? undefined : 'meeting-links-card--incomplete'}
      >
        <MeetingLinksChecklist zoomOk={status.zoomOk} miroOk={status.miroOk} />

        <p className="meeting-links-hint">
          Ці посилання побачать учні в нагадуваннях перед уроком та під час активного заняття.
        </p>

        {!status.complete && !loading && (
          <div className="meeting-links-inline-alert" role="status">
            Позначки залишаться, доки не збережете обидва посилання.
          </div>
        )}

        {error && <div className="alert">{error}</div>}
        {success && <div className="student-login-success">{success}</div>}

        <label className={`meeting-links-field${!status.zoomOk && !loading ? ' meeting-links-field--missing' : ''}`}>
          <span>Zoom (постійне посилання на конференцію)</span>
          <input
            className="input"
            type="url"
            placeholder="https://us05web.zoom.us/j/..."
            value={zoomUrl}
            onChange={e => setZoomUrl(e.target.value)}
            disabled={loading}
          />
        </label>

        <label className={`meeting-links-field${!status.miroOk && !loading ? ' meeting-links-field--missing' : ''}`}>
          <span>Miro (дошка для уроків)</span>
          <input
            className="input"
            type="url"
            placeholder="https://miro.com/app/board/..."
            value={miroUrl}
            onChange={e => setMiroUrl(e.target.value)}
            disabled={loading}
          />
        </label>

        <button type="button" className="btn btn-teal" onClick={save} disabled={loading || saving}>
          {saving ? 'Збереження…' : 'Зберегти посилання'}
        </button>
      </Card>
    </div>
  )
}
