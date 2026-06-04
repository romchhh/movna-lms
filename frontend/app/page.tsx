import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export default async function RootPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value

  if (!token) redirect('/auth/login')

  // Decode role from JWT (client-side redirect handled by middleware)
  try {
    const [, payload] = token.split('.')
    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString())
    const role = decoded?.role
    if (role === 'admin')   redirect('/admin')
    if (role === 'teacher') redirect('/teacher')
    redirect('/student')
  } catch {
    redirect('/auth/login')
  }
}
