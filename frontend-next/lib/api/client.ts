import createClient, { type Client } from 'openapi-fetch';
import type { paths } from './schema';

const SERVER_BASE = process.env.API_URL_INTERNAL ?? 'http://localhost:8000';

/**
 * Browser-side typed API client.
 *
 * Uses a RELATIVE base URL (`/api`) so browser calls go to this Next.js app,
 * not directly to FastAPI. The catch-all route handler at `app/api/[...path]`
 * reads the httpOnly session cookie and forwards the request to FastAPI as
 * `Authorization: Bearer <token>`.
 *
 * This is the BFF (Backend For Frontend) pattern:
 *   - JavaScript never touches the JWT (httpOnly cookie)
 *   - FastAPI is not exposed directly to the browser
 *   - SameSite=Lax on the cookie + same-origin calls block CSRF from other sites
 */
export function browserClient(): Client<paths> {
  return createClient<paths>({ baseUrl: '/api' });
}

/**
 * Server-side typed API client for server components / server actions.
 * Calls FastAPI directly (inside the Docker network) and forwards the
 * session token as a bearer header.
 */
export function serverClient(token?: string | null): Client<paths> {
  return createClient<paths>({
    baseUrl: SERVER_BASE,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
}
