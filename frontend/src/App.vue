<template>
  <div class="main-container">
    <div class="player-container">
      <AlbumArt
        :src="currentSong?.runtimeCover || currentSong?.cover"
        @cover-change="onCoverChange"
        class="album-art"
      />
      <Playlist class="playlist" />
      <ProgressBar class="progress" />
      <PlayerControls class="controls" />
      <AudioPlayer />
    </div>
    <div class="lyrics-container">
      <LyricsDisplay />
    </div>
  </div>
  <div v-if="store.playlist.length"></div>
  <div v-else class="error">
    <h2>播放器加载失败</h2>
    <ul>
      <li>播放列表未初始化（当前列表长度：{{ store.playlist.length }}）</li>
      <li>资源路径错误（当前歌曲：{{ currentSong?.url }}）</li>
    </ul>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { usePlayerStore } from '@/stores/player'
import AlbumArt from '@/components/AlbumArt.vue'
import Playlist from '@/components/Playlist.vue'
import ProgressBar from '@/components/ProgressBar.vue'
import PlayerControls from '@/components/PlayerControls.vue'
import AudioPlayer from '@/components/AudioPlayer.vue'
import LyricsDisplay from '@/components/LyricsDisplay.vue'
import '@/assets/css/container.css'

const store = usePlayerStore()
const currentSong = computed(() => store.currentSong)

function onCoverChange(coverUrl) {
  if (coverUrl && (coverUrl.startsWith('http') || coverUrl.startsWith('/'))) {
    store.updateCurrentSongCover(coverUrl)
  }
}
</script>
