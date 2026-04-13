import { NextResponse } from 'next/server';

// Health endpoint for Docker healthchecks. Intentionally NOT under /api so it
// bypasses the BFF proxy and does not hit FastAPI.
export function GET() {
  return NextResponse.json({ status: 'ok', service: 'frontend-next' });
}
