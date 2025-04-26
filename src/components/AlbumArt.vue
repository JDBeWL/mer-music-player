<template>
  <div class="album-art">
    <img :src="encodeURI(src)" alt="Album Cover" v-if="src" />
    <div class="placeholder" v-else>🎵</div>
  </div>
</template>

<script setup>
import('@/assets/css/albumart.css')
defineProps({
  src: String
})
</script>
