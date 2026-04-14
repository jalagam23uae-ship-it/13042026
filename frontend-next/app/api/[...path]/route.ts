import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionToken } from '@/lib/auth/session';

const FASTAPI_BASE = process.env.API_URL_INTERNAL ?? 'http://localhost:8000';

// Headers that MUST NOT be forwarded from the browser request to FastAPI.
const STRIP_REQUEST_HEADERS = new Set([
  'host',
  'connection',
  'content-length',
  'cookie', // we replace auth with the bearer token below
  'authorization',
  'accept-encoding',
]);

// Headers that MUST NOT be forwarded from FastAPI's response back to the browser.
const STRIP_RESPONSE_HEADERS = new Set([
  'transfer-encoding',
  'content-encoding',
  'content-length',
  'connection',
]);

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const url = new URL(request.url);
  const target = `${FASTAPI_BASE}/${path.join('/')}${url.search}`;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!STRIP_REQUEST_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ detail: 'Not authenticated' }, { status: 401 });
  }
  headers.set('authorization', `Bearer ${token}`);

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';

  const upstream = await fetch(target, {
    method: request.method,
    headers,
    body: hasBody ? request.body : undefined,
    // 'follow': Node.js resolves any FastAPI trailing-slash redirects internally.
    // The browser never sees an internal `http://backend:8000/...` Location header.
    redirect: 'follow',
    cache: 'no-store',
    // Required by undici when streaming a request body.
    ...(hasBody ? { duplex: 'half' } : {}),
  } as RequestInit & { duplex?: 'half' });

  const responseHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!STRIP_RESPONSE_HEADERS.has(key.toLowerCase())) {
      responseHeaders.set(key, value);
    }
  });

  return new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
