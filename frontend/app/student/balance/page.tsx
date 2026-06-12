'use client'

import { Badge, Card, Empty, PageHeader, ProgressBar } from '@/components/shared/UI'
import {
  PRODUCT_ACCENT,
  ProductBalance,
  Transaction,
  formatOptimateDate,
  optimateApi,
} from '@/lib/optimate-api'
import { useCallback, useEffect, useState } from 'react'

function BalanceCard({ product }: { product: ProductBalance }) {
  const accent = PRODUCT_ACCENT[product.product_type] ?? { color: 'var(--p)', badge: 'gray' as const }
  const pct = product.lessons_total > 0
    ? (product.lessons_remaining / product.lessons_total) * 100
    : 0
  const low = product.lessons_remaining <= 3 && product.lessons_remaining > 0

  return (
    <Card title={product.product_name}>
      <div style={{ marginBottom: 8 }}>
        <Badge variant={accent.badge}>{product.product_type_label}</Badge>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <div className="student-balance-hero" style={{ fontSize: 36, fontWeight: 700, color: 'var(--tx)' }}>
            {product.lessons_remaining}
          </div>
          {low && <Badge variant="amber">⚠ Мало</Badge>}
        </div>
        <div style={{ fontSize: 13, color: 'var(--tx2)', marginBottom: 12 }}>
          з {product.lessons_total} куплених · {product.lessons_used} використано
        </div>
        <ProgressBar pct={pct} color={accent.color} />
      </div>

      {product.price_per_lesson != null && product.price_per_lesson > 0 && (
        <div style={{ fontSize: 12, color: 'var(--tx3)' }}>
          Ціна за урок: {product.price_per_lesson} ₴
        </div>
      )}
    </Card>
  )
}

function TransactionRow({ tx }: { tx: Transaction }) {
  const date = formatOptimateDate(tx.transaction_date || tx.created_at)
  const lessonDelta = tx.lesson_count
    ? `${tx.is_credit ? '+' : '−'}${Math.abs(tx.lesson_count)} ур.`
    : tx.amount
      ? `${tx.amount} ₴`
      : ''

  return (
    <div className="optimate-tx-row">
      <div className="optimate-tx-date">{date}</div>
      <div className="optimate-tx-body">
        <div className="optimate-tx-title">{tx.type_label}</div>
        <div className="optimate-tx-sub">
          {tx.product_name || tx.description || '—'}
        </div>
      </div>
      {lessonDelta && (
        <div
          className="optimate-tx-delta"
          style={{ color: tx.is_credit ? 'var(--td)' : 'var(--rd)' }}
        >
          {lessonDelta}
        </div>
      )}
    </div>
  )
}

export default function StudentBalance() {
  const [balances, setBalances] = useState<ProductBalance[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [bal, tx] = await Promise.all([
        optimateApi.balances(),
        optimateApi.transactions(1, 15),
      ])
      setBalances(bal.data)
      setTransactions(tx.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка завантаження')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <>
      <PageHeader
        title="Баланс уроків"
        sub={loading ? 'Завантаження з Optimate...' : 'Актуальні баланси по всіх продуктах'}
      />

      {error && <div className="alert">{error}</div>}

      {!loading && !error && balances.length === 0 && (
        <Empty label="Продуктів з балансом не знайдено" />
      )}

      {balances.length > 0 && (
        <div className={`optimate-balance-grid${balances.length === 1 ? ' optimate-balance-grid--single' : ''}`}>
          {balances.map(product => (
            <BalanceCard key={product.product_id || product.product_name} product={product} />
          ))}
        </div>
      )}

      <Card title="Історія транзакцій">
        {loading && <Empty label="Завантаження..." />}
        {!loading && transactions.length === 0 && (
          <Empty label="Транзакцій поки немає" />
        )}
        {transactions.map(tx => (
          <TransactionRow key={tx.id} tx={tx} />
        ))}
      </Card>

      <a
        href="https://t.me/Natalka_technical_support"
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-primary btn-full"
        style={{ textDecoration: 'none', display: 'inline-flex', justifyContent: 'center', maxWidth: 420 }}
      >
        Написати менеджеру для поповнення
      </a>
    </>
  )
}
