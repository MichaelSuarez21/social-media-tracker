import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Middleware to protect our application routes
 */
export function middleware(request: NextRequest) {
  // Protect cron job routes
  if (request.nextUrl.pathname.startsWith('/api/cron')) {
    const apiKey = request.nextUrl.searchParams.get('key')
    const validApiKey = process.env.METRICS_REFRESH_API_KEY
    
    if (!apiKey || apiKey !== validApiKey) {
      return new NextResponse(
        JSON.stringify({ success: false, message: 'Unauthorized' }),
        { status: 401, headers: { 'content-type': 'application/json' } }
      )
    }
  }

  // Continue to other middleware or route handlers
  return NextResponse.next()
}

/**
 * Specify which routes should trigger this middleware
 */
export const config = {
  matcher: ['/api/cron/:path*'],
} 