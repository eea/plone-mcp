import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node', // Keeping 'node' as per Jest config
    setupFiles: ['./tests/setup.ts'], // Vitest's equivalent of setupFilesAfterEnv
    include: ['**/*.{test,spec}.{ts,js}'], // Similar to Jest's testMatch
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'], // Default excludes
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.d.ts',
        'src/index.ts', // Exclude main entry point if it's just bootstrapping
        'src/plone-mcp-server.ts', // Exclude specific server file
      ],
    },
    testTimeout: 10000, // 10 seconds, matching Jest's testTimeout
    alias: {
      "xmcp/headers": path.resolve(__dirname, "./tests/mocks/xmcp-headers.ts"),
    },
  },
});
