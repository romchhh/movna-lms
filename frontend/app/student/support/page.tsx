import { PageHeader, Card } from '@/components/shared/UI'

const faqs = [
  { q: 'Як приєднатись до Zoom-заняття?', a: 'Перейдіть до розділу "Розклад" → кнопка "Приєднатись" активується за 15 хвилин до початку заняття.' },
  { q: 'Коли розблокується наступний урок?', a: 'Наступний урок відкривається автоматично після завершення поточного. Натисніть "Завершити урок" в кінці.' },
  { q: 'Як здати домашнє завдання?', a: 'Розділ "Домашні завдання" → знайдіть потрібне завдання → натисніть "Здати" → завантажте файл або введіть текст.' },
  { q: 'Де побачити баланс уроків?', a: 'Баланс відображається на дашборді та в розділі "Баланс уроків". Дані оновлюються автоматично з Оптімейту.' },
  { q: 'Як поповнити баланс?', a: 'Натисніть "Написати менеджеру" в розділі "Баланс уроків" — менеджер школи проведе оплату через Оптімейт.' },
  { q: 'Де знаходяться матеріали до уроку?', a: 'Відкрийте урок у розділі "Мій курс" — всі матеріали, відео та Miro-дошка знаходяться всередині уроку.' },
]

export default function StudentSupport() {
  return (
    <>
      <PageHeader title="Підтримка та FAQ" sub="Часті запитання та контакти" />

      <Card title="Зв'язатись з командою">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { icon: '💬', label: 'Telegram менеджера', sub: 'Відповідь протягом 2 годин', href: 'https://t.me/movna_manager', btn: 'Написати в Telegram', color: 'var(--p)' },
            { icon: '📧', label: 'Email підтримки', sub: 'support@movna.ua', href: 'mailto:support@movna.ua', btn: 'Написати email', color: 'var(--t)' },
          ].map((c, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', background: 'var(--bg2)', borderRadius: 'var(--r8)' }}>
              <div style={{ fontSize: 24 }}>{c.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx)' }}>{c.label}</div>
                <div style={{ fontSize: 12, color: 'var(--tx2)', marginTop: 1 }}>{c.sub}</div>
              </div>
              <a href={c.href} target="_blank" rel="noreferrer" className="btn btn-sm" style={{ background: c.color, color: '#fff', textDecoration: 'none' }}>
                {c.btn}
              </a>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Часті запитання">
        {faqs.map((faq, i) => (
          <div key={i} style={{ padding: '12px 0', borderBottom: '.5px solid var(--bd)' }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx)', marginBottom: 5 }}>❓ {faq.q}</div>
            <div style={{ fontSize: 13, color: 'var(--tx2)', lineHeight: 1.6 }}>{faq.a}</div>
          </div>
        ))}
      </Card>
    </>
  )
}
