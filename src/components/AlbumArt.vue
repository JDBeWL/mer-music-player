<template>
  <div class="album-art">
    <img :src="encodeURI(src)" alt="Album Cover" v-if="src" />
    <div class="placeholder" v-else>🎵</div>
  </div>
</template>

<script setup>
import('@/assets/css/album-art.css')
defineProps({
  src: String
})
</script>
