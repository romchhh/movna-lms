'use client'

import { PortalLoginPasswordPanel } from '@/components/admin/PortalLoginPasswordPanel'

interface StudentLoginPasswordPanelProps {
  optimateStudentId: string
}

/** @deprecated Use PortalLoginPasswordPanel */
export function StudentLoginPasswordPanel({ optimateStudentId }: StudentLoginPasswordPanelProps) {
  return <PortalLoginPasswordPanel kind="student" optimateId={optimateStudentId} />
}
