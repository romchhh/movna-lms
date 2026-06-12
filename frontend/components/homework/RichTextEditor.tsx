'use client'

import { isEditorEmpty, sanitizeHtml, toEditorHtml } from '@/lib/rich-text'
import { useCallback, useEffect, useRef, useState } from 'react'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minHeight?: number
}

type Tool = {
  label: string
  title: string
  command: string
  arg?: string
}

const TOOLS: Tool[] = [
  { label: 'B', title: 'Жирний', command: 'bold' },
  { label: 'I', title: 'Курсив', command: 'italic' },
  { label: 'U', title: 'Підкреслення', command: 'underline' },
  { label: 'H2', title: 'Заголовок', command: 'formatBlock', arg: 'h2' },
  { label: '•', title: 'Список', command: 'insertUnorderedList' },
  { label: '1.', title: 'Нумерований список', command: 'insertOrderedList' },
]

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Текст завдання…',
  minHeight = 200,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const lastEmitted = useRef(value)
  const [fullscreen, setFullscreen] = useState(false)

  const emit = useCallback(() => {
    const el = editorRef.current
    if (!el) return
    const raw = el.innerHTML
    const next = isEditorEmpty(raw) ? '' : sanitizeHtml(raw)
    lastEmitted.current = next
    onChange(next)
  }, [onChange])

  useEffect(() => {
    const el = editorRef.current
    if (!el) return
    if (value === lastEmitted.current && !isEditorEmpty(el.innerHTML)) return
    el.innerHTML = toEditorHtml(value)
    lastEmitted.current = value
  }, [value])

  function runTool(tool: Tool) {
    editorRef.current?.focus()
    document.execCommand(tool.command, false, tool.arg)
    emit()
  }

  function onPaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    document.execCommand('insertText', false, text)
    emit()
  }

  const panel = (
    <div className={`rte-editor${fullscreen ? ' rte-editor--fullscreen' : ''}`}>
      <div className="rte-toolbar">
        <div className="rte-tools">
          {TOOLS.map(tool => (
            <button
              key={tool.label}
              type="button"
              className="rte-tool"
              title={tool.title}
              onMouseDown={e => e.preventDefault()}
              onClick={() => runTool(tool)}
            >
              {tool.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="rte-expand"
          onClick={() => setFullscreen(f => !f)}
        >
          {fullscreen ? 'Згорнути' : 'На весь екран'}
        </button>
      </div>
      <div
        ref={editorRef}
        className="rte-surface prose-hw"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        style={{ minHeight }}
        onInput={emit}
        onBlur={emit}
        onPaste={onPaste}
      />
    </div>
  )

  if (fullscreen) {
    return (
      <div className="md-editor-overlay" onClick={() => setFullscreen(false)}>
        <div onClick={e => e.stopPropagation()}>{panel}</div>
      </div>
    )
  }

  return panel
}
