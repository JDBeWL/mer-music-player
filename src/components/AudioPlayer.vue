<template>
  <audio ref="audioElement" :src="getSongUrl(currentSong?.url)"
    :type="currentSong?.url?.endsWith('.flac') ? 'audio/flac' : 'audio/mpeg'" @timeupdate="updateTime"
    @ended="handleSongEnd" @loadedmetadata="setDuration" @error="handleAudioError" />
</template>

<script setup>
import { computed, ref, watch, onMounted } from "vue";
import { usePlayerStore } from "@/stores/player";

const store = usePlayerStore();
const audioElement = ref(null);

// 计算当前歌曲
const currentSong = computed(() => store.currentSong);

// 处理Electron环境下的文件路径
const getSongUrl = (url) => {
  if (!url) return '';

  // 检查是否在Electron环境下
  if (window.require) {
    const path = window.require('path');
    try {
      // 检查是否已经是绝对路径
      if (url.startsWith('/') && !url.includes('://') && !path.isAbsolute(url)) {
        // 转换为绝对路径
        const fullPath = path.join(process.cwd(), 'public', url);
        console.log(`转换路径: ${url} -> file://${fullPath}`);
        return `file://${fullPath}`;
      }
    } catch (error) {
      console.error('路径转换错误:', error);
    }
  }
  return url;
};

// 处理音频加载错误
const handleAudioError = (e) => {
  console.error('音频加载错误:', e);
  console.error('当前URL:', currentSong.value?.url);
  console.error('处理后URL:', getSongUrl(currentSong.value?.url));

  // 可以在这里添加错误处理逻辑，比如尝试使用备用URL或显示错误信息
};

// 监听播放状态变化
watch(
  () => store.isPlaying,
  (playing) => {
    playing ? audioElement.value.play() : audioElement.value.pause();
  }
);

watch(() => store.currentSong, async (newSong, oldSong) => {
  if (newSong && newSong !== oldSong) {
    try {
      audioElement.value.pause()
      audioElement.value.currentTime = 0

      // 强制重新加载音频源，使用处理后的URL
      audioElement.value.src = getSongUrl(newSong.url)
      await audioElement.value.load()

      // 添加ready状态监听
      const playWhenReady = () => {
        audioElement.value.removeEventListener('canplay', playWhenReady)
        if (store.isPlaying) {
          audioElement.value.play().catch(e => {
            console.log('需要用户交互后才能自动播放', e)
          })
        }
      }

      if (audioElement.value.readyState > 3) {
        playWhenReady()
      } else {
        audioElement.value.addEventListener('canplay', playWhenReady)
      }
    } catch (error) {
      console.error('音频加载失败:', error)
    }
  }
})

// 更新时间
const updateTime = () => {
  store.setCurrentTime(audioElement.value.currentTime);
};

// 设置总时长
const setDuration = () => {
  store.setDuration(audioElement.value.duration);
};

// 歌曲播放结束处理
const handleSongEnd = () => {
  store.nextSong();
};

// 初始化时注册音频
onMounted(() => {
  if (!store.playlist.length) {
    console.error("播放列表未加载！");
  }
  store.registerAudioElement(audioElement.value);

  watch(
    () => store.currentTime,
    (newTime) => {
      if (Math.abs(audioElement.value.currentTime - newTime) > 0.1) {
        audioElement.value.currentTime = newTime;
      }
    }
  )
})
</script>

<style scoped>
audio {
  display: none;
}
</style>