import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { usePlayerStore } from './stores/player'
import App from './App.vue'
import './assets/css/main.css'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)

async function initApp() {
  const playerStore = usePlayerStore()
  try {
    const response = await fetch('/src/assets/data/playlist.json')
    if (!response.ok) {
      throw new Error(`加载playlist.json失败, 状态码: ${response.status}`)
    }
    const demoPlaylist = await response.json()
    playerStore.initialize(demoPlaylist)
  } catch (error) {
    console.error('初始化播放列表失败:', error)
  }
  app.mount('#app')
}

initApp()