'use client'

interface SimpleAnswerFieldProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minRows?: number
}

export function SimpleAnswerField({
  value,
  onChange,
  placeholder = 'Напишіть відповідь або прикріпіть файл…',
  minRows = 5,
}: SimpleAnswerFieldProps) {
  return (
    <textarea
      className="input hw-simple-answer"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={minRows}
    />
  )
}
