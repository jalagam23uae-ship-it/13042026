import { describe, expect, it } from 'vitest';
import { cn } from './utils';

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
