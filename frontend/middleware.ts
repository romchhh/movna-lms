import { NextRequest, NextResponse } from 'next/server'

function decodeTokenPayload(token: string): { role: string | null; expired: boolean } {
  try {
    const [, payload] = token.split('.')
    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString())
    const exp = typeof decoded?.exp === 'number' ? decoded.exp : 0
    const expired = exp > 0 && Date.now() / 1000 > exp
    const role = typeof decoded?.role === 'string' ? decoded.role : null
    return { role, expired }
  } catch {
    return { role: null, expired: true }
  }
}

function homeForRole(role: string): string {
  if (role === 'admin') return '/admin'
  if (role === 'teacher') return '/teacher'
  return '/student'
}

function clearTokenCookie(response: NextResponse) {
  response.cookies.set('token', '', { path: '/', maxAge: 0 })
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value
  const path = request.nextUrl.pathname
  const { role, expired } = token ? decodeTokenPayload(token) : { role: null, expired: false }
  const hasValidToken = Boolean(token && role && !expired)

  const isPublic =
    path.startsWith('/auth') ||
    path === '/privacy' ||
    path === '/terms'

  if (!hasValidToken && !isPublic) {
    const response = NextResponse.redirect(new URL('/auth/login', request.url))
    if (token) clearTokenCookie(response)
    return response
  }

  if (hasValidToken && isPublic) {
    return NextResponse.redirect(new URL(homeForRole(role!), request.url))
  }

  if (path === '/' && hasValidToken && role) {
    return NextResponse.redirect(new URL(homeForRole(role), request.url))
  }

  if (hasValidToken && role) {
    if (path.startsWith('/student') && role !== 'student') {
      return NextResponse.redirect(new URL(homeForRole(role), request.url))
    }
    if (path.startsWith('/teacher') && !['teacher', 'admin'].includes(role)) {
      return NextResponse.redirect(new URL(homeForRole(role), request.url))
    }
    if (path.startsWith('/admin') && role !== 'admin') {
      return NextResponse.redirect(new URL(homeForRole(role), request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api|branding/).*)'],
}
