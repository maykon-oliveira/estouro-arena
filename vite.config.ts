import { defineConfig } from 'vitest/config';
import { qrcode } from 'vite-plugin-qrcode';

export default defineConfig({
  base: './',
  // Com `bun run dev --host`, imprime no terminal um QR code do endereço de rede (teste no celular).
  plugins: [qrcode()],
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1600, // Phaser sozinho tem ~1,2 MB
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
