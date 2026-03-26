import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { logger } from "@/shared/lib/logger";
import { WASM_FILES } from "@/shared/lib/constants/apiProxy";

const MIME: Record<(typeof WASM_FILES)[number], string> = {
  "splash_wasm.js": "application/javascript",
  "splash_wasm_bg.wasm": "application/wasm",
};

/**
 * Serve Splash WASM with correct Content-Type so dynamic import() works in production
 * regardless of reverse-proxy MIME for /wasm/*.
 */
export async function GET(_request: NextRequest, context: { params: Promise<{ file: string }> }) {
  const { file } = await context.params;
  if (!file || !WASM_FILES.includes(file as (typeof WASM_FILES)[number])) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    const publicDir = join(process.cwd(), "public");
    const body = await readFile(join(publicDir, "wasm", file));
    const contentType = MIME[file as (typeof WASM_FILES)[number]];
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    logger.error("[api/wasm]", file, err);
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
