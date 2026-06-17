import type { ReactNode } from 'react'
import { PlusIcon } from './Icons'

export function AddButtonLabel({ children }: { children: ReactNode }) {
  return (
    <>
      <PlusIcon className="btn-leading-icon" />
      {children}
    </>
  )
}
