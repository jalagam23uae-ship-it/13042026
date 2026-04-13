import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SESSION_COOKIE = process.env.SESSION_COOKIE_NAME ?? 'atp_session';

/**
 * Optimistic auth gate for Next 16 (proxy, formerly middleware).
 *
 * This is deliberately lightweight: it ONLY checks whether a session
 * cookie is present and redirects to /login if not. The *authoritative*
 * auth check — "is this cookie valid, does this user have this role?" —
 * happens in the layouts via the DAL (`requireUser` / `requireAdmin`).
 *
 * The docs explicitly warn that Proxy should not be used as a full
 * session management or authorization solution.
 */
export function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const { pathname } = request.nextUrl;

  // If there's no cookie and the user is hitting a protected path,
  // send them to /login before we even render the layout.
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// Only run on authenticated page routes. API + health + _next are excluded
// so the BFF catch-all can return proper JSON 401s and Docker health checks
// don't require auth.
export const config = {
  matcher: ['/((?!login|api|healthz|_next|favicon.ico).*)'],
};
