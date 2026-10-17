import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

// Smoke tests contra o build de produção (o mesmo que vai para a Vercel).
export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      // Celular na horizontal, com toque.
      name: 'mobile-landscape',
      use: {
        ...devices['Pixel 7'],
        viewport: { width: 812, height: 375 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: `bun run build && bun run preview --port ${PORT} --strictPort`,
    port: PORT,
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
});
