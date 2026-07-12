/** Web UI школи в Optimate (відмітка проведення, ЗП). */
export const OPTIMATE_PORTAL_URL =
  (process.env.NEXT_PUBLIC_OPTIMATE_PORTAL_URL || 'https://movna.optimate.online').replace(/\/$/, '')

export function optimatePortalHomeUrl(): string {
  return OPTIMATE_PORTAL_URL
}
