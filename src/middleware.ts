import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export default function middleware(request: NextRequest) {
  const host = request.headers.get('host') || ''

  if (host === 'multator.site' || host === 'www.multator.site') {
    const pathname = request.nextUrl.pathname
    const search = request.nextUrl.search
    const response = NextResponse.redirect(
      `https://toonator.site${pathname}${search}`,
      302
    )
    response.cookies.set('locale', 'ru', {
      path: '/',
      sameSite: 'lax',
      secure: true,
      maxAge: 60 * 60 * 24 * 365,
    })
    return response
  }
}

export const config = {
  matcher: ['/((?!_next|favicon.ico).*)'],
}