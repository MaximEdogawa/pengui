#!/usr/bin/env bun
/* eslint-disable no-console -- CLI script; console is the intended output */
/**
 * Smoke test for API proxy routes (Space Scan, WASM).
 * Run against a running app (e.g. bun run dev) or production:
 *
 *   bun run test:api-proxy
 *   BASE_URL=https://penguinpool.space bun run test:api-proxy
 *
 * On the server, run against localhost to verify nginx + app:
 *   BASE_URL=http://localhost bun run test:api-proxy
 *
 * If tokens returns 502 in production (server can't reach Space Scan), use:
 *   ALLOW_TOKENS_502=1 BASE_URL=https://penguinpool.space bun run test:api-proxy
 */

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const ALLOW_TOKENS_502 = process.env.ALLOW_TOKENS_502 === "1";

type Result = { name: string; ok: boolean; detail: string };

async function test(
  name: string,
  url: string,
  checks: {
    status?: number;
    contentType?: string;
    bodyJson?: (data: unknown) => boolean;
    allow502?: boolean;
  }
): Promise<Result> {
  try {
    const res = await fetch(url, { method: "GET" });
    const statusOk =
      checks.status == null ||
      res.status === checks.status ||
      (checks.allow502 && res.status === 502);
    const ct = res.headers.get("content-type") ?? "";
    const contentTypeOk =
      checks.contentType == null ||
      (checks.allow502 && res.status === 502) ||
      ct.toLowerCase().includes(checks.contentType.toLowerCase());

    let bodyOk = true;
    if (checks.bodyJson && res.ok) {
      const data = await res.json().catch(() => null);
      bodyOk = data != null && checks.bodyJson(data);
    }
    if (checks.allow502 && res.status === 502) {
      bodyOk = true;
    }

    const ok = statusOk && contentTypeOk && bodyOk;
    const detail = !statusOk
      ? `status ${res.status} (expected ${checks.status})`
      : !contentTypeOk
        ? `content-type "${ct}" (expected ${checks.contentType})`
        : !bodyOk
          ? "body check failed"
          : `OK ${res.status}`;
    return { name, ok, detail };
  } catch (e) {
    return { name, ok: false, detail: (e as Error).message };
  }
}

async function main() {
  console.log(`Testing API proxy routes at ${BASE}\n`);

  const results: Result[] = [];

  results.push(
    await test("GET /api/spacescan/tokens", `${BASE}/api/spacescan/tokens`, {
      status: 200,
      contentType: "application/json",
      bodyJson: (d) =>
        typeof d === "object" && d != null && "status" in d && (d as { status: string }).status === "success" && "cats" in d,
      allow502: ALLOW_TOKENS_502,
    })
  );

  const sampleIconUrl = "https://assets.spacescan.io/cat/f5cd9dccc98c1fd4f32b599324b6dd938c793c0e50af7581195aee603277bad8.webp";
  results.push(
    await test(
      "GET /api/spacescan/icon",
      `${BASE}/api/spacescan/icon?url=${encodeURIComponent(sampleIconUrl)}`,
      { status: 200, contentType: "image" }
    )
  );

  try {
    const wasmJs = await fetch(`${BASE}/api/wasm/splash_wasm.js`).then((r) => ({
      status: r.status,
      ct: r.headers.get("content-type"),
    }));
    results.push({
      name: "GET /api/wasm/splash_wasm.js",
      ok:
        (wasmJs.status === 200 && (wasmJs.ct ?? "").toLowerCase().includes("application/javascript")) ||
        wasmJs.status === 404,
      detail:
        wasmJs.status === 404
          ? "404 (WASM not built — run bun run build:wasm to test)"
          : wasmJs.status === 200
            ? `OK ${wasmJs.status}`
            : `status ${wasmJs.status}`,
    });
  } catch (e) {
    results.push({ name: "GET /api/wasm/splash_wasm.js", ok: false, detail: (e as Error).message });
  }

  try {
    const wasmBg = await fetch(`${BASE}/api/wasm/splash_wasm_bg.wasm`).then((r) => ({
      status: r.status,
      ct: r.headers.get("content-type"),
    }));
    results.push({
      name: "GET /api/wasm/splash_wasm_bg.wasm",
      ok:
        (wasmBg.status === 200 && (wasmBg.ct ?? "").toLowerCase().includes("application/wasm")) ||
        wasmBg.status === 404,
      detail:
        wasmBg.status === 404
          ? "404 (WASM not built)"
          : wasmBg.status === 200
            ? `OK ${wasmBg.status}`
            : `status ${wasmBg.status}`,
    });
  } catch (e) {
    results.push({ name: "GET /api/wasm/splash_wasm_bg.wasm", ok: false, detail: (e as Error).message });
  }

  let failed = 0;
  let tokens502 = false;
  for (const r of results) {
    const badge = r.ok ? "PASS" : "FAIL";
    console.log(`  [${badge}] ${r.name} — ${r.detail}`);
    if (!r.ok) failed++;
    if (r.name === "GET /api/spacescan/tokens" && r.detail.includes("502")) tokens502 = true;
  }

  console.log("");
  if (tokens502 && ALLOW_TOKENS_502) {
    console.log("  Note: tokens returned 502 (server may not reach Space Scan). Deploy latest route (User-Agent + retries) or check server network.");
  }
  if (failed > 0) {
    console.log(`  ${failed} check(s) failed. Fix routes or run against a server that has the app + WASM built.`);
    process.exit(1);
  }
  console.log("  All API proxy checks passed.");
}

main();
