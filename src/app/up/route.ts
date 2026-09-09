import { NextResponse } from "next/server";

// Health check endpoint required by ONCE (https://github.com/basecamp/once)
// for automatic TLS/reverse-proxy routing. Must return 200 on plain HTTP.
export async function GET() {
  return NextResponse.json({ status: "up" }, { status: 200 });
}
