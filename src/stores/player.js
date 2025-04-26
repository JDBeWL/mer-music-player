import { defineStore } from 'pinia'

// 歌曲类型定义
const defaultSong = {
    id: null,
    title: 'Unknown',
    artist: 'Unknown',
    cover: '',
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
        // 初始化方法
        initialize(initialPlaylist) {
            this.playlist = initialPlaylist.map(song => ({
                ...song,
                cover: encodeURI(song.cover),
                url: encodeURI(song.url)
            }))
            if (this.playlist.length > 0) {
                this.currentSong = this.playlist[0]
                this.isPlaying = false // 初始化为暂停状态
            }
        },
        seekToTime(time) {
            // 确保时间合法
            const clampedTime = Math.max(0, Math.min(time, this.duration));
            this.currentTime = clampedTime;
            
            // 通知音频元素更新播放位置
            if (this.audioElement) {
              this.audioElement.currentTime = clampedTime;
            }
        },
        // 修改初始化方法
        registerAudioElement(element) {
            this.audioElement = element;
        },
      
        playPause() {
            this.isPlaying = !this.isPlaying
        },
        nextSong() {
            if (!this.playlist.length) return
            const index = this.playlist.findIndex(song => song.id === this.currentSong.id);
            const nextIndex = (index + 1) % this.playlist.length;
            this.currentSong = this.playlist[nextIndex];
            this.isPlaying = true;
        },
        prevSong() {
            if (!this.playlist.length) return
            const index = this.playlist.findIndex(song => song.id === this.currentSong.id);
            const prevIndex = (index - 1 + this.playlist.length) % this.playlist.length;
            this.currentSong = this.playlist[prevIndex];
            this.isPlaying = true;
        },
        selectSong(song) {
            this.currentSong = song;
            this.isPlaying = true;
        },
        setCurrentTime(time) {
            this.currentTime = time
        },
        setDuration(time) {
            this.duration = time
        }
    }
})