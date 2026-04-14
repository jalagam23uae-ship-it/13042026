import 'server-only';

import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { serverClient } from '@/lib/api/client';
import type { components } from '@/lib/api/schema';

export type SessionUser = components['schemas']['UserOut'];

export const SESSION_COOKIE = process.env.SESSION_COOKIE_NAME ?? 'atp_session';

/** Read the raw JWT token from the httpOnly session cookie, or null. */
export async function getSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

/**
 * Data Access Layer entry point. Memoized per request via React cache()
 * so multiple layouts / pages sharing a render pass only hit the backend
 * once.
 *
 * Returns null if not logged in or the session is invalid/expired.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = await getSessionToken();
  if (!token) return null;

  const client = serverClient(token);
  const { data, response } = await client.GET('/users/me', {});
  if (response.status >= 400) return null;
  return (data as SessionUser | undefined) ?? null;
});

/** Redirect to /login if no session; otherwise return the user. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}

/** Redirect to / if the user is not an admin. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== 'admin') redirect('/');
  return user;
}

/** Redirect to / if the user is not an admin or instructor. */
export async function requireManager(): Promise<SessionUser> {
  const user = await requireUser();
  const role = user.role?.toLowerCase();
  if (role !== 'admin' && role !== 'instructor') redirect('/');
  return user;
}

/** True if the user's role is admin (case-insensitive). */
export function isAdmin(user: SessionUser): boolean {
  return user.role?.toLowerCase() === 'admin';
}

/** True if the user is an admin or instructor (case-insensitive). */
export function isManager(user: SessionUser): boolean {
  const role = user.role?.toLowerCase();
  return role === 'admin' || role === 'instructor';
}

/** True if the user's role is student (case-insensitive). */
export function isStudent(user: SessionUser): boolean {
  return user.role?.toLowerCase() === 'student';
}

/**
 * Persist a session: writes the raw JWT into an httpOnly cookie.
 * Called from the login server action after a successful backend call.
 */
export async function createSession(token: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    // 24 hours — matches the backend's ACCESS_TOKEN_EXPIRE_MINUTES default.
    maxAge: 60 * 60 * 24,
  });
}

/** Destroy the session. Called from the logout server action. */
export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
