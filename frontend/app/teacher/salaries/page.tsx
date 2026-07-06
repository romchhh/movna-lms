'use client'

import { Card, Empty, PageHeader, StatCard } from '@/components/shared/UI'
import {
  type TeacherTransaction,
  type TeacherTransactionsSummary,
  teacherOptimateApi,
} from '@/lib/teacher-optimate-api'
import { formatOptimateDate } from '@/lib/optimate-api'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

type PeriodPreset = 'month' | 'last_month' | 'this_year' | 'all' | 'custom'

function isoDate(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatRangeLabel(from: string, to: string) {
  return `${formatOptimateDate(from)} — ${formatOptimateDate(to)}`
}

function periodRange(
  preset: PeriodPreset,
  customFrom?: string,
  customTo?: string,
): { from?: string; to?: string; label: string } {
  const now = new Date()
  const year = now.getFullYear()

  if (preset === 'month') {
    const start = new Date(year, now.getMonth(), 1)
    return { from: isoDate(start), to: isoDate(now), label: 'Поточний місяць' }
  }
  if (preset === 'last_month') {
    const start = new Date(year, now.getMonth() - 1, 1)
    const end = new Date(year, now.getMonth(), 0)
    return { from: isoDate(start), to: isoDate(end), label: 'Минулий місяць' }
  }
  if (preset === 'this_year') {
    return {
      from: `${year}-01-01`,
      to: isoDate(now),
      label: 'Поточний рік',
    }
  }
  if (preset === 'custom' && customFrom && customTo) {
    return {
      from: customFrom,
      to: customTo,
      label: formatRangeLabel(customFrom, customTo),
    }
  }
  return { label: 'Весь час' }
}

const PRESETS: { key: Exclude<PeriodPreset, 'custom'>; label: string }[] = [
  { key: 'month', label: 'Поточний місяць' },
  { key: 'last_month', label: 'Минулий місяць' },
  { key: 'this_year', label: 'Поточний рік' },
  { key: 'all', label: 'Весь час' },
]

function formatMoney(value: number) {
  return `${value.toLocaleString('uk-UA', { maximumFractionDigits: 0 })} ₴`
}

function TransactionRow({ tx }: { tx: TeacherTransaction }) {
  const date = formatOptimateDate(tx.transaction_date || tx.created_at)
  const signed = tx.signed_amount
  const positive = signed >= 0

  return (
    <div className="optimate-tx-row teacher-salary-tx-row">
      <div className="optimate-tx-date">{date}</div>
      <div className="optimate-tx-body">
        <div className="optimate-tx-title">{tx.type_label}</div>
        <div className="optimate-tx-sub">
          {tx.student_names.join(', ') || tx.product_name || tx.description || '—'}
          {tx.lesson_id && (
            <span className="teacher-salary-lesson-ref"> · урок #{tx.lesson_id}</span>
          )}
          {tx.period_start_date && tx.period_end_date && (
            <span className="teacher-salary-lesson-ref">
              {' '}· {formatOptimateDate(tx.period_start_date)} — {formatOptimateDate(tx.period_end_date)}
            </span>
          )}
        </div>
      </div>
      <div
        className="optimate-tx-delta"
        style={{ color: positive ? 'var(--td)' : 'var(--rd)' }}
      >
        {positive ? '+' : '−'}{formatMoney(Math.abs(signed))}
      </div>
    </div>
  )
}

function TeacherSalariesPanel({ embedded = false }: { embedded?: boolean }) {
  const [preset, setPreset] = useState<PeriodPreset>('month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [draftFrom, setDraftFrom] = useState('')
  const [draftTo, setDraftTo] = useState('')
  const [transactions, setTransactions] = useState<TeacherTransaction[]>([])
  const [summary, setSummary] = useState<TeacherTransactionsSummary | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rangeError, setRangeError] = useState('')
  const [customOpen, setCustomOpen] = useState(false)
  const customRangeRef = useRef<HTMLDivElement>(null)

  const period = useMemo(
    () => periodRange(preset, customFrom, customTo),
    [preset, customFrom, customTo],
  )

  const canLoad = preset !== 'custom' || Boolean(customFrom && customTo)

  const load = useCallback(async () => {
    if (!canLoad) return
    setLoading(true)
    setError('')
    try {
      const res = await teacherOptimateApi.transactions(
        page,
        25,
        period.from,
        period.to,
      )
      setTransactions(res.data)
      setSummary(res.summary)
      setTotal(res.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка завантаження')
    } finally {
      setLoading(false)
    }
  }, [page, period.from, period.to, canLoad])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    setPage(1)
  }, [preset, customFrom, customTo])

  useEffect(() => {
    if (!customOpen) return
    function onDocClick(e: MouseEvent) {
      if (customRangeRef.current && !customRangeRef.current.contains(e.target as Node)) {
        setCustomOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [customOpen])

  function selectPreset(key: Exclude<PeriodPreset, 'custom'>) {
    setPreset(key)
    setRangeError('')
    setCustomOpen(false)
  }

  function openCustomRange() {
    if (customFrom) setDraftFrom(customFrom)
    if (customTo) setDraftTo(customTo)
    setCustomOpen(v => !v)
  }

  function applyCustomRange() {
    if (!draftFrom || !draftTo) {
      setRangeError('Оберіть дату початку та кінця')
      return
    }
    if (draftFrom > draftTo) {
      setRangeError('Дата початку не може бути пізніше за кінець')
      return
    }
    setRangeError('')
    setCustomFrom(draftFrom)
    setCustomTo(draftTo)
    setPreset('custom')
    setCustomOpen(false)
  }

  const content = (
    <>
      {!embedded && (
        <PageHeader
          title="Зарплата та нарахування"
          sub="Нарахування за уроки та виплати з Optimate"
        />
      )}

      <div className="teacher-salary-filters">
        <div className="teacher-salary-presets-row">
          <div className="teacher-salary-presets">
            {PRESETS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                className={`teacher-salary-preset${preset === key ? ' teacher-salary-preset--active' : ''}`}
                onClick={() => selectPreset(key)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="teacher-salary-range-anchor" ref={customRangeRef}>
            <button
              type="button"
              className={`teacher-salary-calendar-btn${preset === 'custom' ? ' teacher-salary-calendar-btn--active' : ''}`}
              onClick={openCustomRange}
              title="Свій період"
              aria-label="Обрати свій період"
              aria-expanded={customOpen}
            >
              <svg viewBox="0 0 24 24" aria-hidden>
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </button>

            {customOpen && (
              <div className="teacher-salary-range-popover">
                <span className="teacher-salary-range-label">Свій період</span>
                <div className="teacher-salary-range-fields">
                  <label className="teacher-salary-date-field">
                    <span>Від</span>
                    <input
                      type="date"
                      className="input teacher-salary-date-input"
                      value={draftFrom}
                      max={draftTo || undefined}
                      onChange={e => setDraftFrom(e.target.value)}
                    />
                  </label>
                  <span className="teacher-salary-range-sep" aria-hidden>—</span>
                  <label className="teacher-salary-date-field">
                    <span>До</span>
                    <input
                      type="date"
                      className="input teacher-salary-date-input"
                      value={draftTo}
                      min={draftFrom || undefined}
                      max={isoDate(new Date())}
                      onChange={e => setDraftTo(e.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={applyCustomRange}
                  >
                    Застосувати
                  </button>
                </div>
                {rangeError && <p className="teacher-salary-range-error">{rangeError}</p>}
              </div>
            )}
          </div>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}

      <div className="g3 teacher-salary-stats">
        <StatCard
          label="Нараховано за уроки"
          value={loading ? '…' : formatMoney(summary?.earned_total ?? 0)}
          sub={loading ? '' : `${summary?.lesson_accrual_count ?? 0} уроків · ${period.label}`}
        />
        <StatCard
          label="Виплати"
          value={loading ? '…' : formatMoney(summary?.payout_total ?? 0)}
          sub={loading ? '' : `${summary?.payout_count ?? 0} інвойсів`}
        />
        <StatCard
          label="Записів у періоді"
          value={loading ? '…' : total}
          sub="транзакцій Optimate"
        />
      </div>

      <Card title={`Історія · ${period.label}`}>
        {loading && <Empty label="Завантаження..." />}
        {!loading && transactions.length === 0 && (
          <Empty label="Транзакцій за обраний період немає" />
        )}
        {!loading && transactions.map(tx => (
          <TransactionRow key={tx.id} tx={tx} />
        ))}

        {!loading && total > 25 && (
          <div className="teacher-salary-pagination">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
            >
              ← Назад
            </button>
            <span className="teacher-salary-page-label">
              Сторінка {page} · {total} записів
            </span>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={page * 25 >= total}
              onClick={() => setPage(p => p + 1)}
            >
              Далі →
            </button>
          </div>
        )}
      </Card>

      <p className="teacher-salary-note">
        Нарахування з’являються в Optimate після проведення уроку. Дані синхронізуються з CRM автоматично.
      </p>
    </>
  )

  if (embedded) return <div className="teacher-salary-embedded">{content}</div>
  return content
}

export default function TeacherSalariesPage() {
  return (
    <div className="teacher-salary-page">
      <TeacherSalariesPanel />
      <div style={{ marginTop: 12 }}>
        <Link href="/teacher" className="btn btn-secondary btn-sm">← На дашборд</Link>
      </div>
    </div>
  )
}
