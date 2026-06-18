'use client'

import { AvatarCropModal } from '@/components/settings/AvatarCropModal'
import { withAvatarCacheBust } from '@/lib/avatar-crop'
import { profileApi, personInitials, type LmsProfile } from '@/lib/profile-api'
import { useRef, useState } from 'react'

interface ProfileAvatarEditorProps {
  name: string
  profile: LmsProfile | null
  role: 'student' | 'teacher'
  onUpdated: (profile: LmsProfile) => void
}

export function ProfileAvatarEditor({ name, profile, role, onUpdated }: ProfileAvatarEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [cropFile, setCropFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')

  const initials = personInitials(name)
  const displayAvatarUrl = previewUrl || profile?.avatar_url || ''
  const hasPhoto = Boolean(displayAvatarUrl)

  function onPickFile(file: File | null) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Оберіть файл зображення')
      return
    }
    setError('')
    setCropFile(file)
  }

  async function uploadCropped(file: File) {
    setUploading(true)
    setError('')
    try {
      const updated = await profileApi.uploadAvatar(file)
      const busted = { ...updated, avatar_url: withAvatarCacheBust(updated.avatar_url) }
      setPreviewUrl(busted.avatar_url)
      onUpdated(busted)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка')
      throw err
    } finally {
      setUploading(false)
    }
  }

  async function removePhoto() {
    setError('')
    setUploading(true)
    try {
      const updated = await profileApi.removeAvatar()
      setPreviewUrl('')
      onUpdated(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка')
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      <div className="profile-avatar-editor">
        <div
          className={`profile-avatar-editor-ring profile-avatar-editor-ring--${role}`}
          aria-hidden={hasPhoto ? undefined : true}
        >
          {hasPhoto ? (
            <img
              src={displayAvatarUrl}
              alt=""
              className="profile-avatar-editor-photo"
              draggable={false}
            />
          ) : (
            <span className="profile-avatar-editor-initials">{initials}</span>
          )}
        </div>

        <div className="profile-avatar-editor-body">
          <div className="profile-avatar-editor-name">{name || initials}</div>

          <div className="profile-avatar-editor-actions">
            <button
              type="button"
              className="btn btn-sm btn-teal profile-avatar-editor-action"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? 'Збереження…' : hasPhoto ? 'Змінити фото' : 'Додати фото'}
            </button>
            {hasPhoto && (
              <button
                type="button"
                className="btn btn-sm btn-secondary profile-avatar-editor-action"
                disabled={uploading}
                onClick={() => void removePhoto()}
              >
                Видалити фото
              </button>
            )}
          </div>

          {error && <p className="profile-avatar-editor-error">{error}</p>}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          onChange={e => {
            onPickFile(e.target.files?.[0] ?? null)
            e.target.value = ''
          }}
        />
      </div>

      {cropFile && (
        <AvatarCropModal
          file={cropFile}
          onClose={() => setCropFile(null)}
          onConfirm={uploadCropped}
        />
      )}
    </>
  )
}
