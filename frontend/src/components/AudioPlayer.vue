<template>
  <audio ref="audioElement" :src="currentSong?.url"
    :type="currentSong?.url.endsWith('.flac') ? 'audio/flac' : 'audio/mpeg'" 
    @timeupdate="updateTime"
    @ended="handleSongEnd" 
    @loadedmetadata="setDuration"
    @play="onPlay"
    @pause="onPause" />
</template>

<script setup>
import { computed, ref, watch, onMounted } from "vue";
import { usePlayerStore } from "@/stores/player";

const store = usePlayerStore();
const audioElement = ref(null);

// 计算当前歌曲
const currentSong = computed(() => store.currentSong);

// 监听播放状态变化
watch(
  () => store.isPlaying,
  (playing) => {
    if (playing) {
      audioElement.value.play().catch(e => {
        console.log('播放失败:', e);
      });
    } else {
      audioElement.value.pause();
    }
  }
);

watch(() => store.currentSong, async (newSong, oldSong) => {
  if (newSong && newSong !== oldSong) {
    try {
      audioElement.value.pause()
      audioElement.value.currentTime = 0

      // 强制重新加载音频源
      audioElement.value.src = newSong.url
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

// 播放和暂停事件处理
const onPlay = () => {
  if ('mediaSession' in navigator) {
    navigator.mediaSession.playbackState = 'playing';
  }
};

const onPause = () => {
  if ('mediaSession' in navigator) {
    navigator.mediaSession.playbackState = 'paused';
  }
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

  // 初始化 Media Session API
  if ('mediaSession' in navigator) {
    console.log('Media Session API 可用');
    
    // 更新媒体元数据
    const updateMediaSession = () => {
      const song = store.currentSong;
      if (!song) return;

      let coverUrl = song.runtimeCover || song.cover || '/covers/default-cover.jpg';
      
      // 如果是 base64 或完整 URL，直接使用；否则添加域名
      if (!coverUrl.startsWith('data:') && !coverUrl.startsWith('http')) {
        coverUrl = window.location.origin + coverUrl;
      }

      console.log('更新 Media Session:', {
        title: song.title,
        artist: song.artist,
        album: song.album
      });

      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: song.title || '未知歌曲',
          artist: song.artist || '未知艺术家',
          album: song.album || '专辑',
          artwork: [
            { 
              src: coverUrl,
              sizes: '512x512',
              type: 'image/jpeg'
            }
          ]
        });
        
        console.log('Media Session metadata 设置成功');
      } catch (error) {
        console.error('设置 Media Metadata 失败:', error);
      }
    };

    // 设置播放控制
    try {
      navigator.mediaSession.setActionHandler('play', () => {
        console.log('Media Session: play');
        if (!store.isPlaying) {
          store.playPause();
        }
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        console.log('Media Session: pause');
        if (store.isPlaying) {
          store.playPause();
        }
      });

      navigator.mediaSession.setActionHandler('previoustrack', () => {
        console.log('Media Session: previous');
        store.prevSong();
      });

      navigator.mediaSession.setActionHandler('nexttrack', () => {
        console.log('Media Session: next');
        store.nextSong();
      });

      navigator.mediaSession.setActionHandler('seekto', (details) => {
        console.log('Media Session: seekto', details.seekTime);
        if (details.seekTime !== undefined && details.seekTime >= 0) {
          audioElement.value.currentTime = details.seekTime;
          store.setCurrentTime(details.seekTime);
        }
      });

      console.log('Media Session 控制器设置成功');
    } catch (error) {
      console.error('设置 Media Session 控制器失败:', error);
    }

    // 监听歌曲变化更新元数据
    watch(() => store.currentSong, () => {
      setTimeout(() => {
        updateMediaSession();
      }, 100);
    }, { immediate: true });

    // 更新播放位置
    const updatePositionState = () => {
      if ('setPositionState' in navigator.mediaSession && store.duration > 0) {
        try {
          const position = Math.min(Math.max(0, store.currentTime), store.duration);
          navigator.mediaSession.setPositionState({
            duration: store.duration,
            playbackRate: audioElement.value?.playbackRate || 1,
            position: position
          });
        } catch (error) {
          // 忽略位置更新错误
        }
      }
    };

    watch(() => store.duration, () => {
      if (store.duration > 0) {
        setTimeout(updatePositionState, 100);
      }
    });
    
    // 每2秒更新一次位置
    setInterval(() => {
      if (store.isPlaying && store.duration > 0) {
        updatePositionState();
      }
    }, 2000);
  } else {
    console.log('Media Session API 不可用');
  }
})
</script>

<style scoped>
audio {
  display: none;
}
</style>