import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export default function middleware(request: NextRequest) {
  // Check if maintenance mode is enabled via environment variable
  const maintenanceMode = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true'
  
  if (maintenanceMode) {
    // Allow access to maintenance page and static assets
    const pathname = request.nextUrl.pathname
    if (pathname === '/maintenance' || pathname.startsWith('/_next') || pathname.startsWith('/css') || pathname.startsWith('/img') || pathname.startsWith('/js')) {
      return NextResponse.next()
    }
    
    // Redirect all other requests to maintenance page
    return NextResponse.redirect(new URL('/maintenance', request.url))
  }

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