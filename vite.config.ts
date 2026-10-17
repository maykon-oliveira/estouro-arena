import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1600, // Phaser sozinho tem ~1,2 MB
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
