import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/shared/lib/logger'

const ALLOWED_HOSTS = ['assets.spacescan.io', 'images.spacescan.io']

function isAllowedIconUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return (
      (parsed.protocol === 'https:' || parsed.protocol === 'http:') &&
      ALLOWED_HOSTS.includes(parsed.host)
    )
  } catch {
    return false
  }
}

/**
 * Proxy Space Scan token icon images so they load when the CDN blocks
 * cross-origin or referrer (e.g. from penguinpool.space).
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')
  if (!url || !isAllowedIconUrl(url)) {
    return NextResponse.json({ error: 'Invalid or disallowed url' }, { status: 400 })
  }
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'image/*' },
      next: { revalidate: 86400 },
    })
    if (!res.ok) {
      return new NextResponse(null, { status: res.status })
    }
    const contentType = res.headers.get('content-type') || 'image/webp'
    const body = await res.arrayBuffer()
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
      },
    })
  } catch (error) {
    logger.error('[api/spacescan/icon]', url, error)
    return NextResponse.json({ error: 'Failed to fetch icon' }, { status: 502 })
  }
}
