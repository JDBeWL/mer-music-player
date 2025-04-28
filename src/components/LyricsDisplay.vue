<template>
    <div class="lyrics-wrapper">
        <div class="lyrics-display" ref="containerRef">
            <div v-if="loading" class="loading">加载歌词中...</div>
            <div v-else-if="!lyrics.length" class="no-lyrics">暂无歌词</div>
            <div v-else>
                <div class="lyrics" v-for="(line, index) in lyrics" :key="index" :class="{ active: isActive(index) }">
                    <template v-if="line.karaoke && isActive(index)">
                        <p v-for="(text, idx) in line.texts" :key="idx">
                            <span class="karaoke-text" :style="getKaraokeStyle(line, text)">
                                {{ text }}
                            </span>
                        </p>
                    </template>
                    <template v-else>
                        <p v-for="(text, idx) in line.texts" :key="idx">
                            {{ text }}
                        </p>
                    </template>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { usePlayerStore } from "@/stores/player";
import { nextTick, ref, watchEffect, onMounted, onUnmounted } from "vue";
import "@/assets/css/lyrics-display.css";

export default {
    name: "LyricsDisplay",
    setup() {
        const playerStore = usePlayerStore();
        const lyrics = ref([]);
        const loading = ref(false);
        const containerRef = ref(null);
        const activeIndex = ref(-1);

        const parseLRC = (lrcText) => {
            const lines = lrcText.split("\n");
            const pattern =
                /\[(\d{2}):(\d{2}):(\d{2})\]|\[(\d{2}):(\d{2})\.(\d{2,3})\]/g;
            const resultMap = {};

            for (const line of lines) {
                const timestamps = [];
                let match;
                while ((match = pattern.exec(line)) !== null) {
                    let time;
                    if (match[1] !== undefined) {
                        const minutes = parseInt(match[1]);
                        const seconds = parseInt(match[2]);
                        const percent = parseInt(match[3]);
                        time = minutes * 60 + seconds + percent / 100;
                    } else {
                        const minutes = parseInt(match[4]);
                        const seconds = parseInt(match[5]);
                        const ms = parseInt(match[6].padEnd(3, "0")) / 1000;
                        time = minutes * 60 + seconds + ms;
                    }
                    timestamps.push({ time, index: match.index });
                }

                if (timestamps.length < 1) continue;

                const text = line.replace(pattern, "").trim();
                if (!text) continue;

                const startTime = timestamps[0].time;
                resultMap[startTime] = resultMap[startTime] || {
                    time: startTime,
                    texts: [],
                    karaoke: null,
                };

                if (timestamps.length > 1) {
                    const karaoke = {
                        fullText: text,
                        timings: timestamps.slice(1).map((stamp, index) => ({
                            time: stamp.time,
                            position: index + 1,
                        })),
                    };
                    resultMap[startTime].texts.push(text);
                    resultMap[startTime].karaoke = karaoke;
                } else {
                    resultMap[startTime].texts.push(text);
                }
            }

            return Object.values(resultMap).sort((a, b) => a.time - b.time);
        };

        const scrollToActiveLyric = (immediate = false) => {
            if (!containerRef.value || activeIndex.value === -1) return;

            const container = containerRef.value;
            const activeElement = container.querySelector(".lyrics.active");

            nextTick(() => {
                if (!activeElement) return;
                const containerRect = container.getBoundingClientRect();
                const elementRect = activeElement.getBoundingClientRect();

                // 计算相对滚动位置
                const relativePosition = elementRect.top - containerRect.top;
                const targetScroll =
                    container.scrollTop +
                    relativePosition -
                    containerRect.height / 3 +
                    elementRect.height / 3;

                const maxScroll = container.scrollHeight - containerRect.height;
                const finalScroll = Math.max(0, Math.min(targetScroll, maxScroll));

                if (Math.abs(container.scrollTop - finalScroll) > 1) {
                    container.scrollTo({
                        top: finalScroll,
                        behavior: immediate ? "auto" : "smooth",
                    });
                }
            });
        };
        const stopWatcher = watchEffect(() => {
            const ADVANCE_TIME = 0.2;
            const currentTime = playerStore.currentTime + ADVANCE_TIME;
            let newIndex = -1;

            let left = 0;
            let right = lyrics.value.length - 1;
            while (left <= right) {
                const mid = Math.floor((left + right) / 2);
                if (currentTime >= lyrics.value[mid].time) {
                    newIndex = mid;
                    left = mid + 1;
                } else {
                    right = mid - 1;
                }
            }

            if (
                newIndex !== -1 &&
                lyrics.value[newIndex + 1] &&
                currentTime >= lyrics.value[newIndex + 1].time
            ) {
                newIndex = -1;
            }

            if (activeIndex.value !== newIndex) {
                activeIndex.value = newIndex;
                scrollToActiveLyric();
            }
        });

        const loadLyrics = async (songTitle) => {
            try {
                loading.value = true;
                const fileName = encodeURIComponent(songTitle) + ".lrc";
                const response = await fetch(`/lyrics/${fileName}`);

                if (!response.ok) throw new Error("歌词不存在");

                const lrcText = await response.text();
                lyrics.value = parseLRC(lrcText);

                nextTick(() => scrollToActiveLyric(true));
            } catch (error) {
                console.warn("歌词加载失败:", error);
                lyrics.value = [];
            } finally {
                loading.value = false;
            }
        };

        watchEffect(() => {
            const title = playerStore.currentSong?.title;
            title && loadLyrics(title);
        });

        const handleResize = () => scrollToActiveLyric(true);
        onMounted(() => window.addEventListener("resize", handleResize));
        onUnmounted(() => {
            window.removeEventListener("resize", handleResize);
            stopWatcher();
        });

        const isActive = (index) => index === activeIndex.value;

        // 卡拉OK支持
        const getKaraokeStyle = (line, text) => {
            if (!line.karaoke) return {};

            const ADVANCE_TIME = 0.2;
            const currentTime = playerStore.currentTime + ADVANCE_TIME;
            const startTime = line.time;
            let progress = 0;

            // 获取当前时间对应的时间段
            const timings = line.karaoke.timings;
            let currentSegment = timings[0];
            let nextSegment = timings[1];

            for (let i = 0; i < timings.length - 1; i++) {
                if (
                    currentTime >= timings[i].time &&
                    currentTime < timings[i + 1].time
                ) {
                    currentSegment = timings[i];
                    nextSegment = timings[i + 1];
                    break;
                }
            }

            if (currentSegment && nextSegment) {
                // 计算进度时也考虑提前量
                const segmentDuration = nextSegment.time - currentSegment.time;
                const adjustedTime = Math.min(currentTime, nextSegment.time);
                const segmentProgress =
                    (adjustedTime - currentSegment.time) / segmentDuration;
                const clampedProgress = Math.max(0, Math.min(1, segmentProgress));

                const charProgress =
                    currentSegment.position +
                    clampedProgress * (nextSegment.position - currentSegment.position);
                progress = (charProgress / text.length) * 100;
            } else if (currentTime >= timings[timings.length - 1]?.time) {
                progress = 100;
            }

            progress = Math.max(0, Math.min(100, progress));

            return {
                "--karaoke-progress": `${progress}%`,
            };
        };

        return {
            lyrics,
            currentTime: playerStore.currentTime,
            isActive,
            loading,
            containerRef,
            getKaraokeStyle,
        };
    },
};
</script>

<style scoped></style>
