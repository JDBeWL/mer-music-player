<template>
    <div class="lyrics-wrapper">
        <div class="lyrics-display" ref="containerRef">
            <div v-if="loading" class="loading">加载歌词中...</div>
            <div v-else-if="!lyrics.length" class="no-lyrics">暂无歌词</div>
            <div v-else>
                <div class="lyrics" v-for="(line, index) in lyrics" :key="index" :class="{ active: isActive(index) }">
                    <p v-for="(text, idx) in line.texts" :key="idx">{{ text }}</p>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { usePlayerStore } from '@/stores/player'
import { nextTick, ref, watchEffect, onMounted, onUnmounted } from 'vue'
import "@/assets/css/lyricsdisplay.css"

export default {
    name: "LyricsDisplay",
    setup() {
        const playerStore = usePlayerStore()
        const lyrics = ref([])
        const loading = ref(false)
        const containerRef = ref(null)
        const activeIndex = ref(-1)

        const parseLRC = (lrcText) => {
            const lines = lrcText.split('\n')
            const pattern = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/
            const resultMap = {}

            for (const line of lines) {
                const matches = pattern.exec(line)
                if (!matches) continue

                const min = parseInt(matches[1]) * 60
                const sec = parseInt(matches[2])
                const ms = parseInt(matches[3].padEnd(3, '0')) / 1000
                const time = min + sec + ms
                const text = line.replace(pattern, '').trim()

                if (text) {
                    if (resultMap[time]) {
                        resultMap[time].texts.push(text)
                    } else {
                        resultMap[time] = { time, texts: [text] }
                    }
                }
            }

            const result = Object.values(resultMap).sort((a, b) => a.time - b.time)
            return result
        }

        const scrollToActiveLyric = (immediate = false) => {
            if (!containerRef.value || activeIndex.value === -1) return

            const container = containerRef.value
            const activeElement = container.querySelector('.lyrics.active')

            nextTick(() => {
                if (!activeElement) return
                const containerRect = container.getBoundingClientRect()
                const elementRect = activeElement.getBoundingClientRect()

                // 计算相对滚动位置
                const relativePosition = elementRect.top - containerRect.top
                const targetScroll = container.scrollTop + relativePosition - (containerRect.height / 2.5) + (elementRect.height / 2)

                const maxScroll = container.scrollHeight - containerRect.height
                const finalScroll = Math.max(0, Math.min(targetScroll, maxScroll))

                if (Math.abs(container.scrollTop - finalScroll) > 1) {
                    container.scrollTo({
                        top: finalScroll,
                        behavior: immediate ? 'auto' : 'smooth'
                    })
                }
            })
        }
        const stopWatcher = watchEffect(() => {
            const currentTime = playerStore.currentTime
            let newIndex = -1

            let left = 0
            let right = lyrics.value.length - 1
            while (left <= right) {
                const mid = Math.floor((left + right) / 2)
                if (currentTime >= lyrics.value[mid].time) {
                    newIndex = mid
                    left = mid + 1
                } else {
                    right = mid - 1
                }
            }

            if (newIndex !== -1 && lyrics.value[newIndex + 1] &&
                currentTime >= lyrics.value[newIndex + 1].time) {
                newIndex = -1
            }

            if (activeIndex.value !== newIndex) {
                activeIndex.value = newIndex
                scrollToActiveLyric()
            }
        })

        const loadLyrics = async (songTitle) => {
            try {
                loading.value = true
                const fileName = encodeURIComponent(songTitle) + '.lrc'
                const response = await fetch(`/lyrics/${fileName}`)

                if (!response.ok) throw new Error('歌词不存在')

                const lrcText = await response.text()
                lyrics.value = parseLRC(lrcText)

                nextTick(() => scrollToActiveLyric(true))
            } catch (error) {
                console.warn('歌词加载失败:', error)
                lyrics.value = []
            } finally {
                loading.value = false
            }
        }

        watchEffect(() => {
            const title = playerStore.currentSong?.title
            title && loadLyrics(title)
        })

        const handleResize = () => scrollToActiveLyric(true)
        onMounted(() => window.addEventListener('resize', handleResize))
        onUnmounted(() => {
            window.removeEventListener('resize', handleResize)
            stopWatcher()
        })

        const isActive = (index) => index === activeIndex.value

        return {
            lyrics,
            currentTime: playerStore.currentTime,
            isActive,
            loading,
            containerRef
        }
    }
}
</script>

<style scoped></style>