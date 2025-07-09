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
    duration: 0
  }),
  actions: {
    initialize(initialPlaylist) {
      this.playlist = initialPlaylist.map(song => ({
        ...defaultSong,
        ...song
      }))
      if (this.playlist.length > 0) {
        this.currentSong = this.playlist[0]
        this.isPlaying = false
      }
    },
    updateCurrentSongCover(runtimeCover) {
      if (!this.currentSong) return
      this.currentSong = {
        ...this.currentSong,
        runtimeCover: runtimeCover || ''
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
    }
  }
})
