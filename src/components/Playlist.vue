<template>
  <div class="playlist">
    <div 
      v-for="song in playlist" 
      :key="song.id" 
      @click="selectSong(song)"
      :class="{ 
        'playlist-item': true,
        'active': song.id === currentSong?.id,
        'loading': song.loading 
      }"
      ref="songItems"
    >
      {{ song.title }} - {{ song.artist }}
      <div v-if="song.loading" class="loading-indicator"></div>
    </div>
  </div>
</template>
<script setup>

import { computed, ref, nextTick } from 'vue'
import { usePlayerStore } from '@/stores/player'

// 可以使用await来按需加载CSS文件
// 比如这样(需要导入onMounted)
// onMounted(async () => {
// if (需要加载样式) {
//   await import('@/assets/css/playlist.css')
// }
// })
import('@/assets/css/playlist.css')

const store = usePlayerStore()
const playlist = computed(() => store.playlist)
const currentSong = computed(() => store.currentSong)
const songItems = ref(null)

const selectSong = async (song) => {
  if (song.disabled) return
  store.currentSong = song
  store.isPlaying = true
  
  await nextTick()
  const activeItem = songItems.value.find(item => 
    item.classList.contains('active')
  )
  
  if (activeItem) {
    activeItem.scrollIntoView({ 
      behavior: 'smooth',
      block: 'nearest'
    })
  }
}
</script>

<style scoped>

</style>