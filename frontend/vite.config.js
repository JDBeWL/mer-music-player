import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { fileURLToPath, URL } from 'node:url' 

export default defineConfig(({ command, mode }) => {
  // 检查是否使用 HTTPS 端口
  const useHttps = process.env.npm_lifecycle_script?.includes('5174');
  
  return {
    plugins: useHttps ? [vue(), basicSsl()] : [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        buffer: 'buffer',
      },
      extensions: ['.js', '.vue'] 
    },
    define: {
      'process.env': {},
      global: 'window'
    },
    optimizeDeps: {
      include: ['buffer']
    },
    server: {
      host: '0.0.0.0',
      // 阻止对lyrics目录的history回退
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
  }
})
