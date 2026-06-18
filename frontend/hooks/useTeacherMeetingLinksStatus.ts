'use client'

import {
  MEETING_LINKS_UPDATED_EVENT,
  meetingLinksStatus,
  teacherMeetingLinksApi,
  type MeetingLinks,
  type MeetingLinksStatus,
} from '@/lib/meeting-links-api'
import { useCallback, useEffect, useState } from 'react'

export function useTeacherMeetingLinksStatus() {
  const [links, setLinks] = useState<MeetingLinks>({ zoom_url: '', miro_url: '' })
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<MeetingLinksStatus>({
    complete: false,
    missingCount: 2,
    zoomOk: false,
    miroOk: false,
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await teacherMeetingLinksApi.get()
      setLinks(data)
      setStatus(meetingLinksStatus(data))
    } catch {
      setLinks({ zoom_url: '', miro_url: '' })
      setStatus(meetingLinksStatus({ zoom_url: '', miro_url: '' }))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    const onUpdate = () => void load()
    window.addEventListener(MEETING_LINKS_UPDATED_EVENT, onUpdate)
    window.addEventListener('focus', onUpdate)
    return () => {
      window.removeEventListener(MEETING_LINKS_UPDATED_EVENT, onUpdate)
      window.removeEventListener('focus', onUpdate)
    }
  }, [load])

  return { links, loading, status, reload: load }
}
