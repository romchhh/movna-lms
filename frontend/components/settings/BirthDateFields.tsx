'use client'

const MONTHS_UK = [
  { value: 1, label: 'Січень', short: 'січ' },
  { value: 2, label: 'Лютий', short: 'лют' },
  { value: 3, label: 'Березень', short: 'бер' },
  { value: 4, label: 'Квітень', short: 'кві' },
  { value: 5, label: 'Травень', short: 'тра' },
  { value: 6, label: 'Червень', short: 'чер' },
  { value: 7, label: 'Липень', short: 'лип' },
  { value: 8, label: 'Серпень', short: 'сер' },
  { value: 9, label: 'Вересень', short: 'вер' },
  { value: 10, label: 'Жовтень', short: 'жов' },
  { value: 11, label: 'Листопад', short: 'лис' },
  { value: 12, label: 'Грудень', short: 'гру' },
] as const

const CURRENT_YEAR = new Date().getFullYear()
const MIN_YEAR = 1920

function daysInMonth(month: number, year: number): number {
  if (month < 1 || month > 12) return 31
  if (year < MIN_YEAR || year > CURRENT_YEAR) {
    return [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] ?? 31
  }
  return new Date(year, month, 0).getDate()
}

function formatPreview(day: string, month: string, year: string): string | null {
  const d = Number(day)
  const m = Number(month)
  const y = Number(year)
  if (!day || !month || !year) return null
  if (!Number.isInteger(d) || !Number.isInteger(m) || !Number.isInteger(y)) return null
  const monthLabel = MONTHS_UK.find(x => x.value === m)?.label
  if (!monthLabel || d < 1 || d > daysInMonth(m, y)) return null
  return `${d} ${monthLabel.toLowerCase()} ${y}`
}

export interface BirthDateFieldsProps {
  day: string
  month: string
  year: string
  onDayChange: (value: string) => void
  onMonthChange: (value: string) => void
  onYearChange: (value: string) => void
  accent?: 'purple' | 'teal'
}

export function BirthDateFields({
  day,
  month,
  year,
  onDayChange,
  onMonthChange,
  onYearChange,
  accent = 'purple',
}: BirthDateFieldsProps) {
  const monthNum = Number(month) || 0
  const yearNum = Number(year) || 0
  const maxDay = daysInMonth(monthNum, yearNum)
  const preview = formatPreview(day, month, year)

  const years: number[] = []
  for (let y = CURRENT_YEAR; y >= MIN_YEAR; y -= 1) {
    years.push(y)
  }

  function handleMonthChange(value: string) {
    onMonthChange(value)
    const m = Number(value) || 0
    const y = Number(year) || 0
    const d = Number(day) || 0
    if (d > 0 && m > 0) {
      const max = daysInMonth(m, y)
      if (d > max) onDayChange(String(max))
    }
  }

  function handleYearChange(value: string) {
    onYearChange(value)
    const m = Number(month) || 0
    const y = Number(value) || 0
    const d = Number(day) || 0
    if (d > 0 && m > 0 && y > 0) {
      const max = daysInMonth(m, y)
      if (d > max) onDayChange(String(max))
    }
  }

  const filledCount = [day, month, year].filter(Boolean).length
  const partialHint =
    filledCount > 0 && filledCount < 3
      ? 'Оберіть усі три поля або залиште порожніми'
      : null

  return (
    <div className={`birth-date-fields birth-date-fields--${accent}`}>
      <p className="birth-date-hint">
        День, місяць і рік — зберігаються в Optimate CRM
      </p>
      <div className="birth-date-grid">
        <label className="birth-date-field">
          <span className="birth-date-field-label">День</span>
          <select
            className="birth-date-select"
            value={day}
            onChange={e => onDayChange(e.target.value)}
            aria-label="День народження"
          >
            <option value="">—</option>
            {Array.from({ length: maxDay }, (_, i) => i + 1).map(d => (
              <option key={d} value={String(d)}>{d}</option>
            ))}
          </select>
        </label>

        <label className="birth-date-field birth-date-field--month">
          <span className="birth-date-field-label">Місяць</span>
          <select
            className="birth-date-select"
            value={month}
            onChange={e => handleMonthChange(e.target.value)}
            aria-label="Місяць народження"
          >
            <option value="">Оберіть місяць</option>
            {MONTHS_UK.map(m => (
              <option key={m.value} value={String(m.value)}>{m.label}</option>
            ))}
          </select>
        </label>

        <label className="birth-date-field">
          <span className="birth-date-field-label">Рік</span>
          <select
            className="birth-date-select"
            value={year}
            onChange={e => handleYearChange(e.target.value)}
            aria-label="Рік народження"
          >
            <option value="">Рік</option>
            {years.map(y => (
              <option key={y} value={String(y)}>{y}</option>
            ))}
          </select>
        </label>
      </div>

      {preview && (
        <p className="birth-date-preview" aria-live="polite">
          {preview}
        </p>
      )}
      {partialHint && !preview && (
        <p className="birth-date-partial">{partialHint}</p>
      )}
      {!day && !month && !year && (
        <p className="birth-date-partial">Можна не вказувати — поле необов&apos;язкове</p>
      )}
    </div>
  )
}
