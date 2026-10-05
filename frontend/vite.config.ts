/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const gateway = process.env.GATEWAY_URL ?? 'http://localhost:8080';

// The browser only ever talks to its own origin; Vite forwards API and socket traffic to the gateway.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': gateway,
      '/socket.io': { target: gateway, ws: true },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    restoreMocks: true,
  },
});
