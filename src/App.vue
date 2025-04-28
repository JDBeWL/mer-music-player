<template>
  <div class="main-container">
    <div class="player-container">
      <AlbumArt :src="currentSong?.cover" class="album-art" />
      <Playlist class="playlist" />
      <ProgressBar class="progress" />
      <PlayerControls class="controls" />
      <AudioPlayer />
    </div>
    <div class="lyrics-container">
      <LyricsDisplay />
    </div>
    <div v-if="store.playlist.length">
      <!-- 现有内容 -->
    </div>
    <div v-else class="error">
      <h2>播放器加载失败</h2>
      <p>可能原因：</p>
      <ul>
        <li>播放列表未初始化（当前列表长度：{{ store.playlist.length }}）</li>
        <li>资源路径错误（当前歌曲：{{ currentSong?.url }}）</li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { usePlayerStore } from "@/stores/player";
import AlbumArt from "@/components/AlbumArt.vue";
import Playlist from "@/components/Playlist.vue";
import ProgressBar from "@/components/ProgressBar.vue";
import PlayerControls from "@/components/PlayerControls.vue";
import AudioPlayer from "@/components/AudioPlayer.vue";
import LyricsDisplay from "@/components/LyricsDisplay.vue";
const store = usePlayerStore();
import "@/assets/css/container.css";
// 计算当前歌曲
const currentSong = computed(() => store.currentSong);
const hasLyrics = computed(() => {
  return currentSong.value?.lyrics?.length > 0
})
</script>

<style scoped></style>