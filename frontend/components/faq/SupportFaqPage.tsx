'use client'

import { FaqList } from '@/components/faq/FaqList'
import { Card, PageHeader } from '@/components/shared/UI'
import { faqApi, type FaqPublicItem } from '@/lib/faq-api'
import { useCallback, useEffect, useState } from 'react'

const SUPPORT_TELEGRAM = 'https://t.me/Natalka_technical_support'

export function SupportFaqPage() {
  const [items, setItems] = useState<FaqPublicItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await faqApi.list()
      setItems(res.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка завантаження')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <>
      <PageHeader
        title="Підтримка та FAQ"
        sub="Відповіді на часті питання про портал MOVNA"
      />

      {error && <div className="alert">{error}</div>}

      <Card className="faq-support-card">
        <FaqList items={items} loading={loading} />
      </Card>

      <Card className="faq-support-contact">
        <h3 className="faq-support-contact-title">Не знайшли відповідь?</h3>
        <p className="faq-support-contact-text">
          Напишіть у технічну підтримку — вкажіть email входу та коротко опишіть проблему.
        </p>
        <a
          href={SUPPORT_TELEGRAM}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-teal btn-sm"
        >
          Telegram підтримка
        </a>
      </Card>
    </>
  )
}
