'use client'

import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import { BirthDateFields } from '@/components/settings/BirthDateFields'
import { Card } from '@/components/shared/UI'
import {
  optimateApi,
  profileInitials,
  type BirthDate,
  type StudentProfile,
  type StudentProfileUpdate,
} from '@/lib/optimate-api'
import {
  teacherOptimateApi,
  type TeacherProfile,
  type TeacherProfileUpdate,
} from '@/lib/teacher-optimate-api'

type Role = 'student' | 'teacher'

function labelStyle(): CSSProperties {
  return { fontSize: 12, color: 'var(--tx2)', display: 'block', marginBottom: 5 }
}

function fieldGap(): CSSProperties {
  return { display: 'flex', flexDirection: 'column', gap: 12 }
}

function parseBirthParts(
  day: string,
  month: string,
  year: string,
): BirthDate | null | 'invalid' {
  if (!day.trim() && !month.trim() && !year.trim()) return null
  const d = Number(day)
  const m = Number(month)
  const y = Number(year)
  if (!Number.isInteger(d) || !Number.isInteger(m) || !Number.isInteger(y)) return 'invalid'
  if (d < 1 || d > 31 || m < 1 || m > 12 || y < 1900 || y > 2100) return 'invalid'
  return { day: d, month: m, year: y }
}

export function OptimateProfileCard({ role }: { role: Role }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [chatUrl, setChatUrl] = useState('')
  const [description, setDescription] = useState('')
  const [birthDay, setBirthDay] = useState('')
  const [birthMonth, setBirthMonth] = useState('')
  const [birthYear, setBirthYear] = useState('')

  const applyStudent = useCallback((p: StudentProfile) => {
    setFirstName(p.first_name)
    setLastName(p.last_name)
    setEmail(p.email ?? '')
    setChatUrl(p.chat_url ?? '')
    const bd = p.birth_date
    setBirthDay(bd ? String(bd.day) : '')
    setBirthMonth(bd ? String(bd.month) : '')
    setBirthYear(bd ? String(bd.year) : '')
  }, [])

  const applyTeacher = useCallback((p: TeacherProfile) => {
    setFirstName(p.first_name)
    setLastName(p.last_name)
    setEmail(p.email ?? '')
    setDescription(p.description ?? '')
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const load =
      role === 'student'
        ? optimateApi.profile().then(p => {
            if (!cancelled) applyStudent(p)
          })
        : teacherOptimateApi.profile().then(p => {
            if (!cancelled) applyTeacher(p)
          })

    load
      .catch(e => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Помилка завантаження')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [role, applyStudent, applyTeacher])

  async function handleSave() {
    setError(null)
    setSuccess(null)

    const fn = firstName.trim()
    const ln = lastName.trim()
    if (!fn || !ln) {
      setError("Ім'я та прізвище обов'язкові")
      return
    }

    setSaving(true)
    try {
      if (role === 'student') {
        const birth = parseBirthParts(birthDay, birthMonth, birthYear)
        if (birth === 'invalid') {
          setError('Перевірте дату народження (день, місяць, рік)')
          setSaving(false)
          return
        }
        const payload: StudentProfileUpdate = {
          first_name: fn,
          last_name: ln,
          chat_url: chatUrl.trim(),
          birth_date: birth,
        }
        const updated = await optimateApi.updateProfile(payload)
        applyStudent(updated)
      } else {
        const payload: TeacherProfileUpdate = {
          first_name: fn,
          last_name: ln,
          description,
        }
        const updated = await teacherOptimateApi.updateProfile(payload)
        applyTeacher(updated)
      }
      setSuccess('Збережено в Optimate')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не вдалося зберегти')
    } finally {
      setSaving(false)
    }
  }

  const initials = profileInitials(firstName, lastName)
  const title = role === 'student' ? 'Мій профіль' : 'Профіль викладача'
  const btnClass = role === 'student' ? 'btn btn-primary' : 'btn btn-teal'

  if (loading) {
    return (
      <Card title={title}>
        <p style={{ fontSize: 13, color: 'var(--tx2)' }}>Завантаження профілю…</p>
      </Card>
    )
  }

  return (
    <Card title={title}>
      <p style={{ fontSize: 12, color: 'var(--tx2)', margin: '0 0 12px' }}>
        {role === 'student'
          ? 'Ім’я, прізвище та дата народження синхронізуються з Optimate CRM.'
          : 'Ім’я та опис синхронізуються з Optimate CRM.'}
      </p>
      <div style={fieldGap()}>
        {error && (
          <p style={{ fontSize: 13, color: 'var(--rd)', margin: 0 }}>{error}</p>
        )}
        {success && (
          <p style={{ fontSize: 13, color: 'var(--g)', margin: 0 }}>{success}</p>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 4 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: role === 'student' ? 'var(--pl)' : 'var(--tl)',
              color: role === 'student' ? 'var(--p)' : 'var(--t)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              fontWeight: 500,
            }}
          >
            {initials}
          </div>
        </div>

        <div>
          <label style={labelStyle()}>Ім&apos;я</label>
          <input
            className="input"
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
          />
        </div>
        <div>
          <label style={labelStyle()}>Прізвище</label>
          <input
            className="input"
            value={lastName}
            onChange={e => setLastName(e.target.value)}
          />
        </div>
        <div>
          <label style={labelStyle()}>Email</label>
          <input className="input" value={email} type="email" readOnly disabled />
          <p style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 4, marginBottom: 0 }}>
            Email змінюється лише в Optimate (контакти), не через портал.
          </p>
        </div>

        {role === 'student' ? (
          <>
            <div>
              <label style={labelStyle()}>Посилання на чат (Telegram тощо)</label>
              <input
                className="input"
                value={chatUrl}
                onChange={e => setChatUrl(e.target.value)}
                placeholder="https://t.me/username"
              />
            </div>
            <div>
              <label style={labelStyle()}>Дата народження</label>
              <BirthDateFields
                day={birthDay}
                month={birthMonth}
                year={birthYear}
                onDayChange={setBirthDay}
                onMonthChange={setBirthMonth}
                onYearChange={setBirthYear}
                accent="purple"
              />
            </div>
          </>
        ) : (
          <div>
            <label style={labelStyle()}>Про себе</label>
            <textarea
              className="input"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={5}
              style={{ resize: 'vertical', minHeight: 100 }}
            />
          </div>
        )}

        <button
          type="button"
          className={btnClass}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Збереження…' : 'Зберегти зміни'}
        </button>
      </div>
    </Card>
  )
}
