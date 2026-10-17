import { defineConfig } from 'vitest/config';
import { qrcode } from 'vite-plugin-qrcode';

export default defineConfig({
  base: './',
  // Com `bun run dev --host`, imprime no terminal um QR code do endereço de rede (teste no celular).
  plugins: [qrcode()],
  build: {
    target: 'es2022',
    // SVGs do tema viram arquivos, não data URIs: o carregador do Phaser não lê SVG em data URI.
    assetsInlineLimit: (file) => (file.endsWith('.svg') ? false : undefined),
    chunkSizeWarningLimit: 1600, // Phaser sozinho tem ~1,2 MB
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
