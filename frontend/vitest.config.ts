import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

// Kept separate from vite.config.ts so the production build stays untouched.
// The node:test suite under src/components/layout/__tests__ runs via `npm test`
// and is deliberately not picked up here.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    // jsdom lacks IntersectionObserver, which ConceptLessonViewer mounts. Pure
    // no-op polyfills — see vitest.setup.ts.
    setupFiles: ['./vitest.setup.ts'],
    // Scoped to the suites that import from 'vitest'. The repo also has
    // node:test / self-shimmed harnesses that vitest must not try to collect.
    include: [
      'src/lib/__tests__/**/*.test.ts',
      // spec 007 G-19/G-20: pure location encode/parse/validate. No React, no
      // DOM -- deliberately runnable without mounting the tree.
      'src/components/curriculum/__tests__/**/*.test.ts',
      'src/components/concept/__tests__/**/*.test.tsx',
      'src/components/problem/__tests__/**/*.test.tsx',
      'src/components/debugger/__tests__/**/*.test.ts',
      'src/components/debugger/__tests__/**/*.test.tsx',
    ],
  },
});