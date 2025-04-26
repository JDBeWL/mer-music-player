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

library.add(faPlay, faPause, faForwardStep, faBackwardStep)

const store = usePlayerStore()

const playPause = () => store.playPause()
const nextSong = () => store.nextSong()
const prevSong = () => store.prevSong()
const isPlaying = computed(() => store.isPlaying)
</script>

<style>
.controls {
  display: flex;
  gap: 20px;
  justify-content: center;
  /* margin-top: 20px; */
}

button {
  padding: 12px;
  background: none;
  border: none;
  cursor: pointer;
  color: #2c3e50;
  transition: transform 0.2s;
}

button:hover {
  transform: scale(1.1);
}

svg {
  width: 24px;
  height: 24px;
}
.pulse {
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}
</style>