import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export default function middleware(request: NextRequest) {
  const host = request.headers.get('host') || ''

  if (host === 'multator.site' || host === 'www.multator.site') {
    const url = new URL(request.url)
    url.host = 'toonator.site'
    url.protocol = 'https:'
    const response = NextResponse.redirect(url, 301)
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