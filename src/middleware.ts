import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export default function middleware(request: NextRequest) {
  const host = request.headers.get('host') || ''

  if (host === 'multator.site' || host === 'www.multator.site') {
    const url = request.nextUrl.clone()
    const pathname = url.pathname
    const search = url.search
    const response = NextResponse.redirect(
      `https://toonator.site${pathname}${search}`,
      301
    )
    response.cookies.set('locale', 'ru', {
      path: '/',
      sameSite: 'lax',
      secure: true,
    })
    return response
  }
}

export const config = {
  matcher: ['/((?!_next|favicon.ico).*)'],
}