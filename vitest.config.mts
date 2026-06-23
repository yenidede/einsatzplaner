import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'node',
    setupFiles: ['./src/test/setup-node.ts', './src/test/setup-dom.ts'],
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,
  },
});
