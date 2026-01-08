<template>
  <div class="main-container">
    <div class="player-main">
      <div class="player-content">
        <div class="player-left" :class="{ 'show-lyrics': showMobileLyrics }">
          <div class="mobile-song-info" v-if="showMobileLyrics" @click="toggleMobileLyrics">
            <div class="song-title">{{ currentSong?.title || '未知歌曲' }}</div>
            <div class="song-artist">{{ currentSong?.artist || '未知艺术家' }}</div>
          </div>
          <div class="album-section" v-show="!showMobileLyrics" @click="toggleMobileLyrics">
            <div class="album-art-wrapper">
              <AlbumArt
                :src="currentSong?.runtimeCover || currentSong?.cover"
                @cover-change="onCoverChange"
                class="album-art"
              />
            </div>
            <div class="song-info">
              <div class="song-title">{{ currentSong?.title || '未知歌曲' }}</div>
              <div class="song-artist">{{ currentSong?.artist || '未知艺术家' }}</div>
            </div>
          </div>
          <div class="mobile-lyrics-container" v-show="showMobileLyrics">
            <LyricsDisplay />
          </div>
        </div>
        <div class="lyrics-container desktop-only">
          <LyricsDisplay />
        </div>
      </div>
      <div class="player-bottom">
        <ProgressBar class="progress" />
        <div class="controls-wrapper">
          <PlayerControls class="controls" />
          <button @click="showPlaylist = !showPlaylist" class="playlist-toggle-btn" aria-label="播放列表">
            <font-awesome-icon :icon="['fas', 'list']" />
          </button>
        </div>
      </div>
      <AudioPlayer />
    </div>
  </div>
  
  <!-- 播放列表弹窗 -->
  <div class="playlist-modal" v-if="showPlaylist" @click.self="showPlaylist = false">
    <div class="playlist-panel">
      <div class="playlist-header">
        <h3>播放列表</h3>
        <button @click="showPlaylist = false" class="close-btn" aria-label="关闭">
          <font-awesome-icon :icon="['fas', 'xmark']" />
        </button>
      </div>
      <Playlist class="playlist" />
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
import { computed, ref } from 'vue'
import { usePlayerStore } from '@/stores/player'
import AlbumArt from '@/components/AlbumArt.vue'
import Playlist from '@/components/Playlist.vue'
import ProgressBar from '@/components/ProgressBar.vue'
import PlayerControls from '@/components/PlayerControls.vue'
import AudioPlayer from '@/components/AudioPlayer.vue'
import LyricsDisplay from '@/components/LyricsDisplay.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { library } from '@fortawesome/fontawesome-svg-core'
import { faList, faXmark } from '@fortawesome/free-solid-svg-icons'
import '@/assets/css/container.css'

library.add(faList, faXmark)

const store = usePlayerStore()
const currentSong = computed(() => store.currentSong)
const showPlaylist = ref(false)
const showMobileLyrics = ref(false)

function onCoverChange(coverUrl) {
  if (coverUrl && (coverUrl.startsWith('http') || coverUrl.startsWith('/'))) {
    store.updateCurrentSongCover(coverUrl)
  }
}

function toggleMobileLyrics() {
  if (window.innerWidth <= 1024) {
    showMobileLyrics.value = !showMobileLyrics.value
  }
}
</script>
