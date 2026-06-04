'use client'

import { Badge } from '@/components/shared/UI'
import { normalizeOptimateNote, type OptimateNote } from '@/lib/admin-optimate-api'
import { formatOptimateDate } from '@/lib/optimate-api'

function noteBadgeVariant(type?: number): 'gray' | 'amber' | 'teal' | 'purple' {
  if (type === 2) return 'amber'
  if (type === 3) return 'teal'
  if (type === 4) return 'purple'
  return 'gray'
}

function NoteCard({ note }: { note: OptimateNote }) {
  return (
    <article className="optimate-note-card">
      <div className="optimate-note-head">
        <Badge variant={noteBadgeVariant(note.type)}>{note.type_label || 'Нотатка'}</Badge>
        {note.created_at && (
          <time className="optimate-note-date" dateTime={note.created_at}>
            {formatOptimateDate(note.created_at, true)}
          </time>
        )}
      </div>
      {note.body && (
        <p className="optimate-note-body">{note.body}</p>
      )}
      {note.author_name && (
        <div className="optimate-note-meta">{note.author_name}</div>
      )}
    </article>
  )
}

export function OptimateNotesList({ notes }: { notes: unknown[] }) {
  const parsed = notes
    .map(normalizeOptimateNote)
    .filter((n): n is OptimateNote => n != null && Boolean(n.body || n.type_label))

  if (!parsed.length) {
    return <p className="optimate-detail-empty">Нотаток немає</p>
  }

  return (
    <div className="optimate-notes-list">
      {parsed.map((note, i) => (
        <NoteCard key={note.id || `note-${i}`} note={note} />
      ))}
    </div>
  )
}
