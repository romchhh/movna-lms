'use client'

import { AppModalHeader } from '@/components/shared/AppModalHeader'
import {
  AVATAR_CROP_FRAME,
  avatarCropBaseScale,
  clampAvatarCropTransform,
  renderAvatarCropBlob,
  type AvatarCropTransform,
} from '@/lib/avatar-crop'
import { useCallback, useEffect, useRef, useState } from 'react'

interface AvatarCropModalProps {
  file: File
  onClose: () => void
  onConfirm: (file: File) => Promise<void>
}

export function AvatarCropModal({ file, onClose, onConfirm }: AvatarCropModalProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [transform, setTransform] = useState<AvatarCropTransform>({ scale: 1, x: 0, y: 0 })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const dragRef = useRef<{ active: boolean; startX: number; startY: number; baseX: number; baseY: number } | null>(null)

  useEffect(() => {
    let cancelled = false
    const url = URL.createObjectURL(file)

    setLoading(true)
    setError('')
    setPreviewUrl(url)
    setImage(null)
    setTransform({ scale: 1, x: 0, y: 0 })

    const img = new Image()
    img.onload = () => {
      if (cancelled) return
      setImage(img)
      setLoading(false)
    }
    img.onerror = () => {
      if (cancelled) return
      setError('Не вдалося відкрити зображення')
      setLoading(false)
    }
    img.src = url

    return () => {
      cancelled = true
      URL.revokeObjectURL(url)
    }
  }, [file])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const applyTransform = useCallback(
    (next: AvatarCropTransform) => {
      if (!image) return
      setTransform(clampAvatarCropTransform(image.naturalWidth, image.naturalHeight, next))
    },
    [image],
  )

  function onPointerDown(e: React.PointerEvent) {
    if (!image) return
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      baseX: transform.x,
      baseY: transform.y,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: React.PointerEvent) {
    const drag = dragRef.current
    if (!drag?.active || !image) return
    applyTransform({
      ...transform,
      x: drag.baseX + (e.clientX - drag.startX),
      y: drag.baseY + (e.clientY - drag.startY),
    })
  }

  function onPointerUp(e: React.PointerEvent) {
    if (dragRef.current?.active) {
      dragRef.current.active = false
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }

  function resetCrop() {
    setTransform({ scale: 1, x: 0, y: 0 })
  }

  async function save() {
    if (!image) return
    setSaving(true)
    setError('')
    try {
      const blob = await renderAvatarCropBlob(image, transform)
      const cropped = new File([blob], 'avatar.jpg', { type: 'image/jpeg' })
      await onConfirm(cropped)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка збереження')
    } finally {
      setSaving(false)
    }
  }

  const layout = image
    ? (() => {
        const base = avatarCropBaseScale(image.naturalWidth, image.naturalHeight)
        const total = base * transform.scale
        const w = image.naturalWidth * total
        const h = image.naturalHeight * total
        const left = (AVATAR_CROP_FRAME - w) / 2 + transform.x
        const top = (AVATAR_CROP_FRAME - h) / 2 + transform.y
        return { w, h, left, top }
      })()
    : null

  function imageStyle(frameSize: number) {
    if (!layout || !previewUrl) return undefined
    const factor = frameSize / AVATAR_CROP_FRAME
    return {
      width: layout.w * factor,
      height: layout.h * factor,
      transform: `translate(${layout.left * factor}px, ${layout.top * factor}px)`,
    }
  }

  const ready = !loading && Boolean(image && previewUrl && layout)

  return (
    <div className="avatar-crop-overlay" onClick={onClose}>
      <div className="avatar-crop-modal" onClick={e => e.stopPropagation()}>
        <AppModalHeader
          title="Налаштування фото"
          subtitle="Перетягніть і масштабуйте зображення в квадратній рамці"
          onClose={onClose}
        />

        <div className="avatar-crop-body">
          {error && <div className="alert">{error}</div>}

          <div className="avatar-crop-workspace">
            <div
              className="avatar-crop-frame"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              {loading && <div className="avatar-crop-loading">Завантаження…</div>}
              {!loading && !ready && !error && (
                <div className="avatar-crop-loading">Немає попереднього перегляду</div>
              )}
              {ready && (
                <img
                  src={previewUrl!}
                  alt=""
                  className="avatar-crop-image"
                  style={imageStyle(AVATAR_CROP_FRAME)}
                  draggable={false}
                />
              )}
              <div className="avatar-crop-grid" aria-hidden />
            </div>

            <div className="avatar-crop-previews">
              <div className="avatar-crop-preview-label">Як бачать інші</div>
              <div className="avatar-crop-preview-row">
                <div className="avatar-crop-preview avatar-crop-preview--lg">
                  <div className="avatar-crop-preview-inner avatar-crop-preview-inner--round">
                    {ready && (
                      <img src={previewUrl!} alt="" style={imageStyle(72)} draggable={false} />
                    )}
                  </div>
                </div>
                <div className="avatar-crop-preview avatar-crop-preview--sm">
                  <div className="avatar-crop-preview-inner avatar-crop-preview-inner--round">
                    {ready && (
                      <img src={previewUrl!} alt="" style={imageStyle(36)} draggable={false} />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="avatar-crop-controls">
            <label className="avatar-crop-slider-label" htmlFor="avatar-crop-zoom">
              Масштаб
            </label>
            <input
              id="avatar-crop-zoom"
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={transform.scale}
              disabled={!ready || saving}
              onChange={e => applyTransform({ ...transform, scale: Number(e.target.value) })}
              className="avatar-crop-slider"
            />
            <div className="avatar-crop-slider-hints">
              <span>Віддалити</span>
              <span>Наблизити</span>
            </div>
          </div>

          <div className="avatar-crop-actions">
            <button type="button" className="btn btn-secondary btn-sm" onClick={resetCrop} disabled={!ready || saving}>
              Скинути
            </button>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
              Скасувати
            </button>
            <button type="button" className="btn btn-teal" onClick={() => void save()} disabled={!ready || saving}>
              {saving ? 'Збереження…' : 'Зберегти фото'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
