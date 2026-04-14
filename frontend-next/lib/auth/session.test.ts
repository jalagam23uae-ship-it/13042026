import { describe, expect, it } from 'vitest';
import { isAdmin, isManager, isStudent } from './session';
import type { components } from '@/lib/api/schema';

type SessionUser = components['schemas']['UserOut'];

function makeUser(role: string): SessionUser {
  return {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    role,
    // Cast away remaining required fields — the helpers only look at `role`.
  } as unknown as SessionUser;
}

describe('isAdmin', () => {
  it('returns true for admin role (lowercase)', () => {
    expect(isAdmin(makeUser('admin'))).toBe(true);
  });

  it('returns true for ADMIN role (uppercase)', () => {
    // Guards against the backend returning mixed case. The helper uses
    // toLowerCase() for this reason.
    expect(isAdmin(makeUser('ADMIN'))).toBe(true);
  });

  it('returns true for Admin (titlecase)', () => {
    expect(isAdmin(makeUser('Admin'))).toBe(true);
  });

  it('returns false for instructor', () => {
    expect(isAdmin(makeUser('instructor'))).toBe(false);
  });

  it('returns false for student', () => {
    expect(isAdmin(makeUser('student'))).toBe(false);
  });

  it('returns false for empty role', () => {
    expect(isAdmin(makeUser(''))).toBe(false);
  });
});

describe('isManager', () => {
  it('returns true for admin', () => {
    expect(isManager(makeUser('admin'))).toBe(true);
  });

  it('returns true for instructor', () => {
    expect(isManager(makeUser('instructor'))).toBe(true);
  });

  it('returns true for INSTRUCTOR (uppercase)', () => {
    expect(isManager(makeUser('INSTRUCTOR'))).toBe(true);
  });

  it('returns false for student', () => {
    expect(isManager(makeUser('student'))).toBe(false);
  });

  it('returns false for empty role', () => {
    expect(isManager(makeUser(''))).toBe(false);
  });

  it('returns false for unknown role', () => {
    expect(isManager(makeUser('guest'))).toBe(false);
  });
});

describe('isStudent', () => {
  it('returns true for student (lowercase)', () => {
    expect(isStudent(makeUser('student'))).toBe(true);
  });

  it('returns true for STUDENT (uppercase)', () => {
    expect(isStudent(makeUser('STUDENT'))).toBe(true);
  });

  it('returns false for admin', () => {
    expect(isStudent(makeUser('admin'))).toBe(false);
  });

  it('returns false for instructor', () => {
    expect(isStudent(makeUser('instructor'))).toBe(false);
  });
});
