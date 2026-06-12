'use client'

import { useHomeworkFilePreview } from '@/hooks/useHomeworkFilePreview'
import { downloadHomeworkFile } from '@/lib/homework-api'
import {
  formatFileSize,
  homeworkFileKind,
  homeworkFileKindLabel,
  isHomeworkPreviewable,
  resolveHomeworkFileLabel,
} from '@/lib/homework-file-utils'
import { useEffect, useState } from 'react'

interface HomeworkFileLinkProps {
  url: string
  label: string
  sizeBytes?: number | null
  className?: string
  compact?: boolean
}

function FileMetaRow({
  displayName,
  kind,
  sizeLabel,
  onDownload,
  downloading,
  downloadLabel = 'Завантажити',
}: {
  displayName: string
  kind: ReturnType<typeof homeworkFileKind>
  sizeLabel: string | null
  onDownload: () => void
  downloading: boolean
  downloadLabel?: string
}) {
  const kindLabel = homeworkFileKindLabel(kind)
  return (
    <div className="hw-file-card-meta-row">
      <div className={`hw-file-card-icon hw-file-card-icon--${kind}`} aria-hidden>
        {kindLabel}
      </div>
      <div className="hw-file-card-body">
        <span className="hw-file-card-name" title={displayName}>
          {displayName}
        </span>
        {sizeLabel && <span className="hw-file-card-meta">{sizeLabel}</span>}
      </div>
      <button
        type="button"
        className="hw-file-card-btn"
        disabled={downloading}
        onClick={onDownload}
      >
        {downloading ? '…' : downloadLabel}
      </button>
    </div>
  )
}

export function HomeworkFileLink({ url, label, sizeBytes, className, compact }: HomeworkFileLinkProps) {
  const [downloading, setDownloading] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const displayName = resolveHomeworkFileLabel(label, url)
  const kind = homeworkFileKind(displayName)
  const previewable = isHomeworkPreviewable(kind)
  const sizeLabel = formatFileSize(sizeBytes)
  const { objectUrl, loading, error } = useHomeworkFilePreview(url, previewable)

  useEffect(() => {
    if (!expanded) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [expanded])

  async function download() {
    setDownloading(true)
    try {
      await downloadHomeworkFile(url, displayName)
    } finally {
      setDownloading(false)
    }
  }

  if (previewable) {
    return (
      <div className={className ? `hw-file-preview ${className}` : 'hw-file-preview'}>
        <FileMetaRow
          displayName={displayName}
          kind={kind}
          sizeLabel={sizeLabel}
          onDownload={download}
          downloading={downloading}
        />
        {loading && <p className="hw-file-preview-status">Завантаження превʼю…</p>}
        {error && <div className="alert hw-file-preview-alert">{error}</div>}
        {objectUrl && kind === 'image' && (
          <button
            type="button"
            className="hw-file-preview-media-btn"
            onClick={() => setExpanded(true)}
            aria-label={`Переглянути ${displayName}`}
          >
            <img src={objectUrl} alt={displayName} className="hw-file-preview-img" />
          </button>
        )}
        {objectUrl && kind === 'video' && (
          <video
            src={objectUrl}
            controls
            playsInline
            preload="metadata"
            className="hw-file-preview-video"
          >
            Ваш браузер не підтримує відтворення відео
          </video>
        )}
        {expanded && objectUrl && kind === 'image' && (
          <div className="hw-file-lightbox" onClick={() => setExpanded(false)} role="presentation">
            <img src={objectUrl} alt={displayName} className="hw-file-lightbox-img" />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={className ? `hw-file-card ${className}` : 'hw-file-card'}>
      <FileMetaRow
        displayName={displayName}
        kind={kind}
        sizeLabel={sizeLabel}
        onDownload={download}
        downloading={downloading}
        downloadLabel={compact ? '↓' : 'Завантажити'}
      />
    </div>
  )
}
