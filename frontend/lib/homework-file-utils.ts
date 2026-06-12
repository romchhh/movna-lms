export type HomeworkFileKind =
  | 'pdf'
  | 'image'
  | 'video'
  | 'doc'
  | 'sheet'
  | 'slide'
  | 'audio'
  | 'archive'
  | 'text'
  | 'other'

const IMAGE_EXT = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp'])
const VIDEO_EXT = new Set(['mp4', 'webm', 'mov', 'm4v'])
const DOC_EXT = new Set(['doc', 'docx', 'odt'])
const SHEET_EXT = new Set(['xls', 'xlsx', 'csv'])
const SLIDE_EXT = new Set(['ppt', 'pptx'])
const AUDIO_EXT = new Set(['mp3', 'm4a', 'wav'])
const ARCHIVE_EXT = new Set(['zip', 'rar', '7z'])
const TEXT_EXT = new Set(['txt', 'md'])

export function filenameFromHomeworkUrl(url: string): string {
  if (!url.trim()) return 'Файл'
  try {
    const segment = decodeURIComponent(url.split('/').pop() || '')
    const underscore = segment.indexOf('_')
    if (underscore > 0 && underscore <= 36) {
      const name = segment.slice(underscore + 1)
      if (name) return name
    }
    return segment || 'Файл'
  } catch {
    return 'Файл'
  }
}

export function fileExtension(name: string): string {
  const dot = name.lastIndexOf('.')
  if (dot < 0) return ''
  return name.slice(dot + 1).toLowerCase()
}

export function homeworkFileKind(nameOrUrl: string): HomeworkFileKind {
  const name = nameOrUrl.includes('/') ? filenameFromHomeworkUrl(nameOrUrl) : nameOrUrl
  const ext = fileExtension(name)
  if (ext === 'pdf') return 'pdf'
  if (IMAGE_EXT.has(ext)) return 'image'
  if (VIDEO_EXT.has(ext)) return 'video'
  if (DOC_EXT.has(ext)) return 'doc'
  if (SHEET_EXT.has(ext)) return 'sheet'
  if (SLIDE_EXT.has(ext)) return 'slide'
  if (AUDIO_EXT.has(ext)) return 'audio'
  if (ARCHIVE_EXT.has(ext)) return 'archive'
  if (TEXT_EXT.has(ext)) return 'text'
  return 'other'
}

export function homeworkFileKindLabel(kind: HomeworkFileKind): string {
  const labels: Record<HomeworkFileKind, string> = {
    pdf: 'PDF',
    image: 'IMG',
    video: 'VID',
    doc: 'DOC',
    sheet: 'XLS',
    slide: 'PPT',
    audio: 'AUD',
    archive: 'ZIP',
    text: 'TXT',
    other: 'FILE',
  }
  return labels[kind]
}

export function formatFileSize(bytes?: number | null): string | null {
  if (bytes == null || bytes <= 0) return null
  if (bytes < 1024) return `${bytes} Б`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10_240 ? 1 : 0)} КБ`
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`
}

export function isHomeworkPreviewable(kind: HomeworkFileKind): boolean {
  return kind === 'image' || kind === 'video'
}

export function resolveHomeworkFileLabel(label: string, url: string): string {
  const trimmed = label.trim()
  const generic = ['файл', 'прикріплений файл', 'ваш файл', 'файл учня'].includes(trimmed.toLowerCase())
  if (!generic && trimmed) return trimmed
  return filenameFromHomeworkUrl(url)
}
