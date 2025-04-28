<template>
  <div class="controls">
    <button @click="prevSong" aria-label="上一曲">
      <font-awesome-icon :icon="['fas', 'backward-step']" />
    </button>

    <button @click="playPause" aria-label="播放/暂停">
      <font-awesome-icon :icon="['fas', isPlaying ? 'pause' : 'play']" />
    </button>

    <button @click="nextSong" aria-label="下一曲">
      <font-awesome-icon :icon="['fas', 'forward-step']" />
    </button>
  </div>
</template>

<script setup>
import { usePlayerStore } from '@/stores/player'
import { computed } from 'vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { library } from '@fortawesome/fontawesome-svg-core'
import { faPlay, faPause, faForwardStep, faBackwardStep } from '@fortawesome/free-solid-svg-icons'
import "@/assets/css/player-controls.css"

library.add(faPlay, faPause, faForwardStep, faBackwardStep)

const store = usePlayerStore()

const playPause = () => store.playPause()
const nextSong = () => store.nextSong()
const prevSong = () => store.prevSong()
const isPlaying = computed(() => store.isPlaying)
</script>

<style></style>