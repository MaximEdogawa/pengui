import { NextResponse } from 'next/server'
import { logger } from '@/shared/lib/logger'

const SPACESCAN_TOKENS_URL = 'https://api.spacescan.io/tokens'

/**
 * Proxy Space Scan /tokens to avoid CORS when called from the browser.
 * The Space Scan API does not send Access-Control-Allow-Origin for this endpoint.
 */
export async function GET() {
  try {
    const res = await fetch(SPACESCAN_TOKENS_URL, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      next: { revalidate: 3600 },
    })
    if (!res.ok) {
      return NextResponse.json(
        { status: 'error', message: res.statusText },
        { status: res.status }
      )
    }
    const data = await res.json()
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    })
  } catch (error) {
    logger.error('[api/spacescan/tokens]', error)
    return NextResponse.json(
      { status: 'error', message: 'Failed to fetch tokens' },
      { status: 502 }
    )
  }
}
