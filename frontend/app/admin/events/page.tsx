'use client'

import { AdminEventsCalendar } from '@/components/admin/AdminEventsCalendar'
import { PageHeader } from '@/components/shared/UI'

export default function AdminEvents() {
  return (
    <>
      <PageHeader
        title="Події"
        sub="Усі уроки школи з Optimate"
      />

      <AdminEventsCalendar
        showRangeFilters
        showStatusFilters
        defaultRange="month"
        defaultView="week"
      />
    </>
  )
}
