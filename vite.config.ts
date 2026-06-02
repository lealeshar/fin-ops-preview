import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 3000,
    strictPort: true,
    host: '0.0.0.0',
  },
  build: {
    target: 'ES2022',
    sourcemap: true,
  },
});
