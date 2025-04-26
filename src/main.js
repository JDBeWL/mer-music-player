import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './assets/css/main.css'
import { usePlayerStore } from './stores/player'
import demoPlaylist from './assets/data/playlist.json'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)

// 初始化方式
const playerStore = usePlayerStore() 
playerStore.initialize(demoPlaylist) 

app.mount('#app')