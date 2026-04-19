import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const protectedPaths = ['/dashboard', '/teacher', '/attempts', '/history', '/questions', '/exams']
const authPaths = ['/login', '/register']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const token =
    request.cookies.get('accessToken')?.value ??
    parseAuthStorage(request.cookies.get('auth-storage')?.value)

  const isProtected = protectedPaths.some((p) => pathname.startsWith(p))
  const isAuthPath = authPaths.some((p) => pathname.startsWith(p))

  if (isProtected && !token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (isAuthPath && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

function parseAuthStorage(raw: string | undefined): string | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    return parsed?.state?.accessToken ?? null
  } catch {
    return null
  }
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
