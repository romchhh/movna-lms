export function isRichHtml(content: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(content.trim())
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '')
}

/** Legacy markdown → HTML for editing existing assignments. */
export function markdownToSimpleHtml(md: string): string {
  const trimmed = md.trim()
  if (!trimmed) return ''
  if (isRichHtml(trimmed)) return trimmed

  const blocks = trimmed.split(/\n{2,}/)
  return blocks.map(block => {
    const lines = block.split('\n')
    if (lines.every(l => /^[-*]\s+/.test(l.trim()))) {
      const items = lines
        .map(l => l.trim().replace(/^[-*]\s+/, ''))
        .map(l => `<li>${inlineMarkdown(escapeHtml(l))}</li>`)
        .join('')
      return `<ul>${items}</ul>`
    }
    if (lines.every(l => /^\d+\.\s+/.test(l.trim()))) {
      const items = lines
        .map(l => l.trim().replace(/^\d+\.\s+/, ''))
        .map(l => `<li>${inlineMarkdown(escapeHtml(l))}</li>`)
        .join('')
      return `<ol>${items}</ol>`
    }
    if (lines.length === 1 && /^##\s+/.test(lines[0])) {
      return `<h2>${inlineMarkdown(escapeHtml(lines[0].replace(/^##\s+/, '')))}</h2>`
    }
    const inner = lines.map(l => inlineMarkdown(escapeHtml(l))).join('<br>')
    return `<p>${inner}</p>`
  }).join('')
}

function inlineMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
}

export function toEditorHtml(value: string): string {
  return markdownToSimpleHtml(value)
}

export function isEditorEmpty(html: string): boolean {
  const stripped = html
    .replace(/<br\s*\/?>/gi, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .trim()
  return !stripped
}
