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
    
    <button @click="showAddMusic = true" class="add-music-btn" aria-label="添加音乐">
      <font-awesome-icon :icon="['fas', 'plus']" />
    </button>
    
    <div class="modal-overlay" v-if="showAddMusic" @click.self="showAddMusic = false">
      <PlaylistAdd @close="showAddMusic = false" @music-added="handleMusicAdded" />
    </div>
  </div>
</template>

<script setup>
import { usePlayerStore } from '@/stores/player'
import { computed, ref } from 'vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { library } from '@fortawesome/fontawesome-svg-core'
import { faPlay, faPause, faForwardStep, faBackwardStep, faPlus } from '@fortawesome/free-solid-svg-icons'
import PlaylistAdd from './PlaylistAdd.vue'
import "@/assets/css/player-controls.css"

library.add(faPlay, faPause, faForwardStep, faBackwardStep, faPlus)

const store = usePlayerStore()
const showAddMusic = ref(false)

const playPause = () => store.playPause()
const nextSong = () => store.nextSong()
const prevSong = () => store.prevSong()
const isPlaying = computed(() => store.isPlaying)

const handleMusicAdded = (newMusic) => {
  console.log('新音乐已添加:', newMusic)
}
</script>

<style>

</style>