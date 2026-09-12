import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: 'src',
  base: './',
  publicDir: '../public',
  server: {
    port: 8002,
    strictPort: true,
  },
  preview: {
    port: 8002,
    strictPort: true,
  },
  build: {
    outDir: '../dist',
  },
});
