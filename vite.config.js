import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [vue()],
  base: './',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      buffer: 'buffer',
    },
    extensions: ['.js', '.vue'] 
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  },
  define: {
    'process.env': {},
    global: 'window'
  },
  optimizeDeps: {
    include: ['buffer']
  },
  server: {
    port: 5173,
    historyApiFallback: {
        disableDotRule: true,
        rewrites: [
            {
                from: /^\/lyrics\/.*/,
                to: (context) => context.parsedUrl.pathname.endsWith('.html') ? '/index.html' : null
            }
        ]
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path
      }
    }
  }
});