<template>
  <div class="album-art">
    <img
      :src="displayCover"
      alt="Album Cover"
      v-if="displayCover && displayCover !== 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAHESMIAAAAABJRU5ErkJggg=='"
      @error="onCoverError"
    />
    <div 
      class="placeholder" 
      v-else
      aria-label="Default Album Cover"
    >🎵</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { usePlayerStore } from '@/stores/player'
import '@/assets/css/album-art.css'

const store = usePlayerStore()

const displayCover = computed(() => {
  // 优先使用原始cover
  const cover = store.currentSong?.cover || '';
  // 如果没有有效cover，则使用runtimeCover
  const runtimeCover = store.currentSong?.runtimeCover || '';
  return cover || runtimeCover;
});

function onCoverError() {
  store.updateCurrentSongCover('/covers/default-cover.jpg');
}
</script>

<style scoped>
</style>