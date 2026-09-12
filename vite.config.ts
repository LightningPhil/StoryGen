import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'pages-no-cache-html',
      transformIndexHtml(html) {
        if (html.includes('http-equiv="Cache-Control"')) return html;
        return html.replace(
          '<head>',
          '<head>\n    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">',
        );
      },
    },
  ],
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
    emptyOutDir: true,
  },
});
