import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: ['node_modules', '.next', 'tests/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: [
        'lib/**/*.{ts,tsx}',
        'hooks/**/*.{ts,tsx}',
        'components/common/**/*.{ts,tsx}',
      ],
      exclude: [
        'lib/api/schema.ts',
        '**/*.test.{ts,tsx}',
        '**/*.d.ts',
      ],
      // Intentionally modest thresholds. The goal is "CI fails if
      // someone deletes tests," not "reach 80%." Ratchet upward as new
      // tests land.
      thresholds: {
        lines: 40,
        functions: 40,
        branches: 30,
        statements: 40,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
