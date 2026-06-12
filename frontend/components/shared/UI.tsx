import React from 'react'
import { ChevronLeftIcon, ChevronRightIcon, IconButton } from './Icons'

// ── StatCard ────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string
  value: string | number
  sub?: React.ReactNode
  danger?: boolean
}
export function StatCard({ label, value, sub, danger }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={danger ? { color: 'var(--rd)' } : {}}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}

// ── Badge ───────────────────────────────────────────────────────────────────
type BadgeVariant = 'purple' | 'teal' | 'amber' | 'red' | 'green' | 'gray'
export function Badge({ children, variant = 'gray' }: { children: React.ReactNode; variant?: BadgeVariant }) {
  return <span className={`badge badge-${variant}`}>{children}</span>
}

// ── ProgressBar ─────────────────────────────────────────────────────────────
export function ProgressBar({ pct, color = 'var(--p)', small }: { pct: number; color?: string; small?: boolean }) {
  return (
    <div className={`progress-bar${small ? ' progress-bar-sm' : ''}`}>
      <div className="progress-fill" style={{ width: `${Math.min(100, pct)}%`, background: color }} />
    </div>
  )
}

// ── Avatar ──────────────────────────────────────────────────────────────────
export function Avatar({ initials, bg, color, size = 32 }: { initials: string; bg: string; color: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: bg, color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size < 32 ? 11 : 12, fontWeight: 500, flexShrink: 0,
    }}>{initials}</div>
  )
}

// ── Card ────────────────────────────────────────────────────────────────────
export function Card({
  title,
  children,
  action,
  className,
}: {
  title?: string
  children: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={className ? `card ${className}` : 'card'}>
      {title && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 11 }}>
          <div className="card-title" style={{ marginBottom: 0 }}>{title}</div>
          {action}
        </div>
      )}
      {children}
    </div>
  )
}

// ── PageHeader ──────────────────────────────────────────────────────────────
export function PageHeader({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="page-header">
      <div className="page-header-text">
        <h2>{title}</h2>
        {sub && <p>{sub}</p>}
      </div>
      {children && <div className="page-header-actions">{children}</div>}
    </div>
  )
}

// ── Alert ───────────────────────────────────────────────────────────────────
export function Alert({ children }: { children: React.ReactNode }) {
  return (
    <div className="alert">
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--r)', flexShrink: 0 }} />
      {children}
    </div>
  )
}

// ── Divider Row ──────────────────────────────────────────────────────────────
export function DivRow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: '9px 0', borderBottom: '.5px solid var(--bd)', display: 'flex', alignItems: 'center', gap: 10 }}>
      {children}
    </div>
  )
}

// ── Pagination ─────────────────────────────────────────────────────────────
export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  if (totalPages <= 1) return null

  return (
    <div className="admin-pagination">
      <IconButton
        label="Попередня сторінка"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
      >
        <ChevronLeftIcon />
      </IconButton>
      <span className="admin-pagination-info">
        Сторінка {page} з {totalPages}
      </span>
      <IconButton
        label="Наступна сторінка"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
      >
        <ChevronRightIcon />
      </IconButton>
    </div>
  )
}

// ── Empty state ──────────────────────────────────────────────────────────────
export function Empty({ label }: { label: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--tx3)', fontSize: 13 }}>
      {label}
    </div>
  )
}

// ── Toggle ──────────────────────────────────────────────────────────────────
export function Toggle({ on, onToggle, accent = 'var(--p)' }: { on: boolean; onToggle: () => void; accent?: string }) {
  return (
    <div
      onClick={onToggle}
      style={{
        width: 36, height: 20, borderRadius: 10,
        background: on ? accent : 'var(--bg3)',
        display: 'flex', alignItems: 'center',
        padding: 2, cursor: 'pointer', flexShrink: 0,
        justifyContent: on ? 'flex-end' : 'flex-start',
        transition: 'background .2s',
      }}
    >
      <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff' }} />
    </div>
  )
}
