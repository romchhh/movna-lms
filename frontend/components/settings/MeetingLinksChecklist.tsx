'use client'

interface MeetingLinksChecklistProps {
  zoomOk: boolean
  miroOk: boolean
  compact?: boolean
}

function CheckIcon({ done }: { done: boolean }) {
  if (done) {
    return (
      <span className="ml-check ml-check--done" aria-hidden>
        <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
      </span>
    )
  }
  return (
    <span className="ml-check ml-check--pending" aria-hidden>
      <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /></svg>
    </span>
  )
}

export function MeetingLinksChecklist({ zoomOk, miroOk, compact = false }: MeetingLinksChecklistProps) {
  const complete = zoomOk && miroOk

  return (
    <div className={`ml-checklist${compact ? ' ml-checklist--compact' : ''}${complete ? ' ml-checklist--complete' : ''}`}>
      {!compact && (
        <div className="ml-checklist-head">
          <span className="ml-checklist-title">Обовʼязково для уроків</span>
          {complete ? (
            <span className="ml-checklist-badge ml-checklist-badge--ok">Готово</span>
          ) : (
            <span className="ml-checklist-badge ml-checklist-badge--warn">Потребує уваги</span>
          )}
        </div>
      )}
      <ul className="ml-checklist-items">
        <li className={`ml-checklist-item${zoomOk ? ' ml-checklist-item--done' : ''}`}>
          <CheckIcon done={zoomOk} />
          <div>
            <strong>Zoom</strong>
            <span>{zoomOk ? 'Посилання додано' : 'Додайте постійне посилання на конференцію'}</span>
          </div>
        </li>
        <li className={`ml-checklist-item${miroOk ? ' ml-checklist-item--done' : ''}`}>
          <CheckIcon done={miroOk} />
          <div>
            <strong>Miro</strong>
            <span>{miroOk ? 'Посилання додано' : 'Додайте посилання на дошку'}</span>
          </div>
        </li>
      </ul>
    </div>
  )
}
