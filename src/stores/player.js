import { defineStore } from 'pinia'

const defaultSong = {
  id: null,
  title: 'Unknown',
  artist: 'Unknown',
  cover: '',
  runtimeCover: '',
  url: '',
  duration: 0
}

export const usePlayerStore = defineStore('player', {
  state: () => ({
    currentSong: null,
    playlist: [],
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.7
  }),
  actions: {
    initialize(initialPlaylist) {
      // 验证原始数据
      console.log('初始化播放列表 - 原始数据:', JSON.parse(JSON.stringify(initialPlaylist)));

      // 避免引用共享
      const processed = [...initialPlaylist].map(song => ({
        ...song,
        id: song.id !== undefined ? parseInt(song.id) : Math.floor(Math.random() * 1000000)
      }));
      
      // 执行去重并验证数据完整性
      this.playlist = processed.filter((value, index, self) => {
        // 验证ID类型
        if (typeof value.id !== 'number' || isNaN(value.id)) {
          console.warn(`无效的ID格式: ${value.id} (标题: ${value.title})`);
          return false;
        }
        
        const firstIndex = self.findIndex(t => t.id === value.id);
        if (firstIndex !== index) {
          console.warn(`检测到重复的歌曲ID: ${value.id}，将忽略后续出现的条目 (标题: ${value.title})`);
        }
        return firstIndex === index;
      }).map(song => ({
        ...defaultSong,
        ...song
      }));
      
      if (this.playlist.length > 0) {
        this.currentSong = { ...this.playlist[0] }
        this.isPlaying = false
      }
    },
    updateCurrentSongCover(runtimeCover) {
      if (!this.currentSong) return
      const validRuntimeCover = runtimeCover || this.currentSong.cover || "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAHESMIAAAAABJRU5ErkJggg==";
      
      this.currentSong = {
        ...this.currentSong,
        runtimeCover: validRuntimeCover
      }
      const index = this.playlist.findIndex(s => s.id === this.currentSong.id)
      if (index > -1) {
        this.playlist.splice(index, 1, this.currentSong)
      }
      console.log('当前歌曲更新后:', JSON.parse(JSON.stringify(this.currentSong)))
    },
    selectSong(song) {
      this.currentSong = { ...song }
      this.isPlaying = true
    },
    nextSong() {
      if (!this.playlist.length) return
      const index = this.playlist.findIndex(s => s.id === this.currentSong.id)
      const nextIndex = (index + 1) % this.playlist.length
      this.currentSong = { ...this.playlist[nextIndex] }
      this.isPlaying = true
    },
    prevSong() {
      if (!this.playlist.length) return
      const index = this.playlist.findIndex(s => s.id === this.currentSong.id)
      const prevIndex = (index - 1 + this.playlist.length) % this.playlist.length
      this.currentSong = { ...this.playlist[prevIndex] }
      this.isPlaying = true
    },
    playPause() {
      this.isPlaying = !this.isPlaying
    },
    setCurrentTime(time) {
      this.currentTime = time
    },
    setDuration(time) {
      this.duration = time
    },
    registerAudioElement(element) {
      this.audioElement = element
    },
    seekToTime(time) {
      const clamped = Math.max(0, Math.min(time, this.duration))
      this.currentTime = clamped
      if (this.audioElement) {
        this.audioElement.currentTime = clamped
      }
    },
    setVolume(volume) {
      const clampedVolume = Math.max(0, Math.min(1, volume))
      this.volume = clampedVolume
      if (this.audioElement) {
        this.audioElement.volume = clampedVolume
      }
    }
  }
})
