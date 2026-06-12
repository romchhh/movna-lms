'use client'

import { RichTextEditor } from '@/components/homework/RichTextEditor'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minHeight?: number
  previewLabel?: string
}

/** WYSIWYG editor (Word-like). Kept as MarkdownEditor for existing imports. */
export function MarkdownEditor({
  value,
  onChange,
  placeholder,
  minHeight,
}: MarkdownEditorProps) {
  return (
    <RichTextEditor
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      minHeight={minHeight}
    />
  )
}
