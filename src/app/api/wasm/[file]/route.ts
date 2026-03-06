import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { logger } from '@/shared/lib/logger'

const ALLOWED_FILES = ['splash_wasm.js', 'splash_wasm_bg.wasm'] as const
const MIME: Record<(typeof ALLOWED_FILES)[number], string> = {
  'splash_wasm.js': 'application/javascript',
  'splash_wasm_bg.wasm': 'application/wasm',
}

/**
 * Serve Splash WASM assets with correct Content-Type so dynamic import()
 * works even when a reverse proxy sends wrong MIME for /wasm/*.
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ file: string }> }
) {
  const { file } = await context.params
  if (!file || !ALLOWED_FILES.includes(file as (typeof ALLOWED_FILES)[number])) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  try {
    const publicDir = join(process.cwd(), 'public')
    const body = await readFile(join(publicDir, 'wasm', file))
    const contentType = MIME[file as (typeof ALLOWED_FILES)[number]]
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (err) {
    logger.error('[api/wasm]', file, err)
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }
}
