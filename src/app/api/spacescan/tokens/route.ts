import { NextResponse } from 'next/server'
import { logger } from '@/shared/lib/logger'
import { SPACESCAN_API_TOKENS_URL } from '@/shared/lib/constants/apiProxy'

/**
 * Proxy Space Scan /tokens. Browser calls this to avoid CORS (Space Scan does not send
 * Access-Control-Allow-Origin for this endpoint). Server fetches and returns JSON.
 */
export async function GET() {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15_000)
    const res = await fetch(SPACESCAN_API_TOKENS_URL, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
      next: { revalidate: 3600 },
    })
    clearTimeout(timeout)
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
