'use client'

import { TeacherSalariesPanel } from '@/components/teacher/TeacherSalariesPanel'
import Link from 'next/link'

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
