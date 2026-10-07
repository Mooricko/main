import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {urlExtractPlugin} from './src/server/urlExtractPlugin';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      urlExtractPlugin(),
      {
        name: 'vite-no-cache-deps-plugin',
        configureServer(server) {
          server.middlewares.use((_req, res, next) => {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
            next();
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'lucide-react',
        'motion',
        'motion/react',
        'recharts',
        'canvas-confetti',
        'jszip',
        'gsap',
        'pdfjs-dist',
      ],
      force: true,
    },
    build: {
      outDir: 'dist',
      rollupOptions: {
        output: {
          entryFileNames: 'assets/app.js',
          chunkFileNames: 'assets/[name].js',
          assetFileNames: 'assets/[name].[ext]',
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  };
});
