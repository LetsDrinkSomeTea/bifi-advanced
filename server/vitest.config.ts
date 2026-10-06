import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['server/src/tests/**/*.test.ts'],
    setupFiles: ['server/src/tests/setup.ts'],
    pool: 'forks',
    maxWorkers: 1,
    isolate: false,
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared/src'),
    },
  },
});
