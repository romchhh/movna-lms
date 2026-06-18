import Link from 'next/link'
import type { ReactNode } from 'react'

interface LegalDocumentProps {
  title: string
  updated: string
  children: ReactNode
}

export function LegalDocument({ title, updated, children }: LegalDocumentProps) {
  return (
    <div className="legal-page">
      <article className="legal-card">
        <div className="legal-card-head">
          <Link href="/auth/login" className="legal-back">
            ← До входу
          </Link>
          <img
            src="/branding/movna-logo.svg"
            alt="MOVNA"
            className="legal-logo"
            width={140}
            height={32}
          />
          <h1 className="legal-title">{title}</h1>
          <p className="legal-updated">Останнє оновлення: {updated}</p>
        </div>
        <div className="legal-body">{children}</div>
      </article>
    </div>
  )
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="legal-section">
      <h2>{title}</h2>
      {children}
    </section>
  )
}
