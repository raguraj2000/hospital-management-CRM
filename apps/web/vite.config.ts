import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  server: {
    // Dev: the browser talks to this port only; /api goes to the API server.
    // No changeOrigin, so the API's same-origin check sees matching Origin/Host.
    proxy: { '/api': { target: 'http://localhost:4100' } },
  },
  build: { chunkSizeWarningLimit: 600 },
});
