import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url' 

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
    extensions: ['.js', '.vue'] 
  },
  server: {
    // 阻止对lyrics目录的history回退
    historyApiFallback: {
        disableDotRule: true,
        rewrites: [
            {
                from: /^\/lyrics\/.*/,
                to: (context) => context.parsedUrl.pathname.endsWith('.html') ? '/index.html' : null
            }
        ]
    }
}
})