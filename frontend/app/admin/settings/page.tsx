'use client'
import { useState } from 'react'
import { PageHeader, Card, Toggle } from '@/components/shared/UI'

export default function AdminSettings() {
  const [webhookActive, setWebhookActive] = useState(false)

  return (
    <>
      <PageHeader title="Налаштування системи" />
      <div className="g2">
        <Card title="Інтеграція з Оптімейтом">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--tx2)', display: 'block', marginBottom: 5 }}>Базовий URL API</label>
              <input className="input" placeholder="https://api.optimeit.com/v1" />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--tx2)', display: 'block', marginBottom: 5 }}>API Key</label>
              <input className="input" type="password" placeholder="sk-..." />
            </div>
            <div className="admin-settings-toggle-row">
              <div>
                <div style={{ fontSize: 13, color: 'var(--tx)' }}>Webhook для нових учнів</div>
                <div style={{ fontSize: 11, color: 'var(--tx2)', marginTop: 2 }}>Авто-створення акаунту при реєстрації</div>
              </div>
              <Toggle on={webhookActive} onToggle={() => setWebhookActive(p => !p)} accent="var(--r)" />
            </div>
            <div style={{ background: 'var(--bg2)', borderRadius: 'var(--r8)', padding: '10px 12px' }}>
              <div style={{ fontSize: 11, color: 'var(--tx3)', marginBottom: 4 }}>Ваш Webhook URL:</div>
              <code style={{ fontSize: 12, color: 'var(--p)', wordBreak: 'break-all' }}>
                https://yourdomain.com/api/auth/webhook/optimeite
              </code>
            </div>
            <button className="btn btn-sm" style={{ background: 'var(--rl)', color: 'var(--rd)' }}>🧪 Тест з'єднання</button>
            <button className="btn btn-sm btn-secondary">Зберегти</button>
          </div>
        </Card>

        <Card title="Google Sheets">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ background: 'var(--al)', border: '.5px solid #FAC775', borderRadius: 'var(--r8)', padding: '10px 12px', fontSize: 12, color: '#633806' }}>
              💡 Завантажте credentials.json з Google Cloud Console (Service Account) і вставте вміст нижче.
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--tx2)', display: 'block', marginBottom: 5 }}>Service Account JSON</label>
              <textarea className="input" rows={6} placeholder='{"type": "service_account", ...}' style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: 12 }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--tx2)', display: 'block', marginBottom: 5 }}>Інтервал синхронізації (хвилини)</label>
              <input className="input" type="number" defaultValue={15} min={5} max={60} />
            </div>
            <button className="btn btn-secondary btn-sm">Зберегти</button>
          </div>
        </Card>
      </div>
    </>
  )
}
