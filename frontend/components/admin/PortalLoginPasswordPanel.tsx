'use client'

import { useCallback, useEffect, useState } from 'react'
import { adminOptimateApi, StudentAccount } from '@/lib/admin-optimate-api'
import { CheckIcon, CopyIcon, EyeIcon, EyeOffIcon, IconButton } from '@/components/shared/Icons'

interface PortalLoginPasswordPanelProps {
  kind: 'student' | 'teacher'
  optimateId: string
}

const COPY = {
  student: {
    noEmail: 'У Optimate немає email — додайте контакт, щоб учень міг входити в систему.',
    hint: 'Цей пароль використовується для входу на сторінці логіну LMS.',
  },
  teacher: {
    noEmail: 'У Optimate немає email — додайте контакт, щоб викладач міг входити в систему.',
    hint: 'Цей пароль використовується для входу викладача на сторінці логіну LMS.',
  },
} as const

export function PortalLoginPasswordPanel({ kind, optimateId }: PortalLoginPasswordPanelProps) {
  const text = COPY[kind]
  const [account, setAccount] = useState<StudentAccount | null>(null)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = kind === 'student'
        ? await adminOptimateApi.studentAccount(optimateId)
        : await adminOptimateApi.teacherAccount(optimateId)
      setAccount(res)
      setPassword(res.password ?? '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка')
    } finally {
      setLoading(false)
    }
  }, [kind, optimateId])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    setCopied(false)
  }, [password])

  async function handleSave() {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const res = kind === 'student'
        ? await adminOptimateApi.setStudentPassword(optimateId, password)
        : await adminOptimateApi.setTeacherPassword(optimateId, password)
      setPassword(res.password)
      setSuccess('Пароль збережено')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка')
    } finally {
      setSaving(false)
    }
  }

  async function handleCopy() {
    const value = password.trim()
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Не вдалося скопіювати пароль')
    }
  }

  async function handleGenerate() {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const res = kind === 'student'
        ? await adminOptimateApi.generateStudentPassword(optimateId)
        : await adminOptimateApi.generateTeacherPassword(optimateId)
      setPassword(res.password)
      setShowPassword(true)
      setSuccess('Новий пароль згенеровано')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="optimate-detail-empty">Завантаження доступу до LMS...</p>
  }

  return (
    <div className="student-login-panel">
      {error && <div className="alert">{error}</div>}
      {success && <div className="student-login-success">{success}</div>}

      <div className="optimate-detail-grid">
        <div className="optimate-detail-kv">
          <span>Email для входу</span>
          <strong>{account?.email || '—'}</strong>
        </div>
        <div className="optimate-detail-kv">
          <span>Акаунт LMS</span>
          <strong>{account?.has_account ? 'Створено' : 'Ще не створено'}</strong>
        </div>
      </div>

      {!account?.email && (
        <p className="optimate-detail-empty">{text.noEmail}</p>
      )}

      {account?.email && (
        <>
          <label className="student-login-label" htmlFor={`portal-password-${kind}-${optimateId}`}>
            Пароль для входу
          </label>
          <div className="student-login-row">
            <input
              id={`portal-password-${kind}-${optimateId}`}
              className="input"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={account.has_password ? '••••••••' : 'Пароль не задано'}
              autoComplete="new-password"
            />
            <IconButton
              label={copied ? 'Скопійовано' : 'Копіювати пароль'}
              onClick={handleCopy}
              disabled={!password.trim()}
            >
              {copied ? <CheckIcon /> : <CopyIcon />}
            </IconButton>
            <IconButton
              label={showPassword ? 'Сховати пароль' : 'Показати пароль'}
              onClick={() => setShowPassword(v => !v)}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </IconButton>
          </div>

          <div className="student-login-actions">
            <button
              type="button"
              className="btn btn-sm"
              style={{ background: 'var(--pl)', color: 'var(--pd)' }}
              onClick={handleGenerate}
              disabled={saving}
            >
              {saving ? '...' : 'Згенерувати'}
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleSave}
              disabled={saving || password.trim().length < 6}
            >
              {saving ? 'Збереження...' : 'Зберегти пароль'}
            </button>
          </div>

          <p className="student-login-hint">
            {text.hint}
            {!account.has_password && ' Якщо акаунта ще немає — він буде створений автоматично.'}
          </p>
        </>
      )}
    </div>
  )
}
