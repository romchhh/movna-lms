'use client'

import { AppModalHeader } from '@/components/shared/AppModalHeader'
import { miroEmbedUrl } from '@/lib/meeting-links-api'

interface MiroEmbedModalProps {
  url: string
  title?: string
  onClose: () => void
}

export function MiroEmbedModal({ url, title = 'Miro', onClose }: MiroEmbedModalProps) {
  const embed = miroEmbedUrl(url)

  return (
    <div className="miro-modal-overlay" onClick={onClose}>
      <div className="miro-modal" onClick={e => e.stopPropagation()}>
        <AppModalHeader title={title} subtitle="Дошка відкривається в LMS" onClose={onClose} />
        <div className="miro-modal-body">
          {embed ? (
            <iframe
              className="miro-embed-frame"
              src={embed}
              title={title}
              allow="fullscreen; clipboard-read; clipboard-write"
              allowFullScreen
            />
          ) : (
            <p className="miro-modal-empty">Некоректне посилання Miro</p>
          )}
        </div>
      </div>
    </div>
  )
}
