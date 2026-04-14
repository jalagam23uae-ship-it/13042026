import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// `server-only` throws at import time outside a server context, which
// breaks any test that transitively touches a file marked server-only
// (e.g. `lib/auth/session.ts`). Mock it to a no-op for the test env.
vi.mock('server-only', () => ({}));

// `next/headers` is another server-only module used by session.ts. Stub
// the `cookies()` helper so imports don't blow up. Individual tests that
// need specific cookie behavior can override with `vi.mocked(...)`.
vi.mock('next/headers', () => ({
  cookies: () => ({
    get: () => undefined,
    set: () => {},
    delete: () => {},
  }),
}));

// `next/navigation` is client-safe but redirect() throws in tests. Stub
// redirect/useRouter so components that reference them don't explode.
vi.mock('next/navigation', async () => {
  const actual = await vi.importActual<typeof import('next/navigation')>('next/navigation');
  return {
    ...actual,
    redirect: vi.fn((url: string) => {
      throw new Error(`NEXT_REDIRECT:${url}`);
    }),
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn(),
      refresh: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      prefetch: vi.fn(),
    }),
    usePathname: () => '/',
    useSearchParams: () => new URLSearchParams(),
  };
});
