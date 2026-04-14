import type { components } from '@/lib/api/schema';

// Canonical user type from the generated schema.
// Note: lib/auth/session.ts also exports this as SessionUser — prefer
// importing User from here for non-session contexts.
export type User = components['schemas']['UserOut'];

export type UserRow = {
  id: number;
  name: string;
  email: string;
  role: string;
  is_active?: boolean | null;
  created_at?: string | null;
};
