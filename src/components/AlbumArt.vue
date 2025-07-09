<template>
  <div class="album-art">
    <img
      :src="displayCover"
      alt="Album Cover"
      v-if="displayCover"
      @error="onCoverError"
    />
    <div class="placeholder" v-else>🎵</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { usePlayerStore } from '@/stores/player'
import '@/assets/css/album-art.css'

const store = usePlayerStore()

const displayCover = computed(() => {
  return store.currentSong?.runtimeCover || store.currentSong?.cover || ''
})

function onCoverError() {
  store.updateCurrentSongCover('')
}
</script>

<style scoped>

.placeholder {
  width: 200px;
  height: 200px;
  background: #ddd;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  border-radius: 12px;
}
</style>
