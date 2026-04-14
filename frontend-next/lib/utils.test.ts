import { describe, expect, it } from 'vitest';
import { cn, asArray, fmt } from './utils';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('p-2', 'm-2')).toBe('p-2 m-2');
  });

  it('dedupes conflicting Tailwind utilities (last wins)', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it('ignores falsy values', () => {
    expect(cn('p-2', null, undefined, false && 'm-2', 'mt-1')).toBe('p-2 mt-1');
  });
});

describe('asArray', () => {
  it('returns an empty array for undefined', () => {
    expect(asArray(undefined)).toEqual([]);
  });

  it('returns an empty array for null', () => {
    expect(asArray(null)).toEqual([]);
  });

  it('returns an empty array for a plain object', () => {
    expect(asArray({})).toEqual([]);
  });

  it('returns an empty array for a string', () => {
    // Guards against the FastAPI error-shape case where data is sometimes
    // a { detail: '...' } object or an error string.
    expect(asArray('oops')).toEqual([]);
  });

  it('returns the input array as-is when given an array', () => {
    const input = [1, 2, 3];
    expect(asArray<number>(input)).toEqual([1, 2, 3]);
  });

  it('preserves empty arrays', () => {
    expect(asArray([])).toEqual([]);
  });

  it('is typed generically via the type parameter', () => {
    // This test exists mostly as a compile-time assertion — runtime just
    // confirms the value flows through unchanged.
    type User = { id: number; name: string };
    const raw: unknown = [{ id: 1, name: 'alice' }];
    const users = asArray<User>(raw);
    expect(users).toHaveLength(1);
    expect(users[0]?.name).toBe('alice');
  });
});

describe('fmt', () => {
  it('returns an em-dash for null', () => {
    expect(fmt(null)).toBe('—');
  });

  it('returns an em-dash for undefined', () => {
    expect(fmt(undefined)).toBe('—');
  });

  it('returns an em-dash for empty string', () => {
    // `new Date('')` is Invalid Date; we treat empty as missing.
    expect(fmt('')).toBe('—');
  });

  it('formats an ISO date string (month/day/year)', () => {
    // Don't compare against a locale-specific exact string — just verify
    // the three expected components appear.
    const output = fmt('2026-04-14T12:00:00Z');
    expect(output).toMatch(/Apr/);
    expect(output).toMatch(/14/);
    expect(output).toMatch(/2026/);
  });

  it('formats a date-only ISO string', () => {
    const output = fmt('2026-12-25');
    expect(output).toMatch(/Dec/);
    expect(output).toMatch(/25/);
    expect(output).toMatch(/2026/);
  });
});
