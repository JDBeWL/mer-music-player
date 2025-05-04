<template>
    <div class="lyrics-wrapper">
        <div class="lyrics-display" ref="containerRef">
            <div v-if="loading" class="loading">加载歌词中...</div>
            <div v-else-if="!lyrics.length" class="no-lyrics">暂无歌词</div>
            <div v-else>
                <div class="lyrics" v-for="(line, index) in lyrics" :key="index" 
                     :class="{ active: isActive(index) }">
                    <template v-if="line.karaoke && isActive(index)">
                        <!-- 英文卡拉OK部分 -->
                        <p class="english">
                            <span v-for="(word, idx) in line.words" :key="idx"
                                :class="['karaoke-text', { 'active': isWordActive(word) }]"
                                :style="getASSKaraokeStyle(word)">
                                {{ word.text }}
                            </span>
                        </p>
                        <!-- 中文翻译部分 -->
                        <p class="chinese" v-if="line.texts[1]">{{ line.texts[1] }}</p>
                    </template>
                    <template v-else>
                        <!-- 非激活状态显示双语 -->
                        <p class="english">{{ line.texts[0] }}</p>
                        <p class="chinese" v-if="line.texts[1]">{{ line.texts[1] }}</p>
                    </template>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { usePlayerStore } from '@/stores/player'
import { nextTick, ref, watchEffect, onMounted, onUnmounted } from 'vue'
import "@/assets/css/lyrics-display.css"

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

        const parseASS = (assText) => {
            const lines = assText.split('\n');
            const dialogues = [];
            
            // 解析时间转换函数
            const toSeconds = (t) => {
                const [h, m, s] = t.split(':');
                return parseInt(h) * 3600 + parseInt(m) * 60 + parseFloat(s);
            };

            // 收集所有对话行
            for (const line of lines) {
                if (!line.startsWith('Dialogue:')) continue;
                const parts = line.split(',');
                if (parts.length < 10) continue;

                const start = parts[1].trim();
                const end = parts[2].trim();
                const style = parts[3].trim();
                const text = parts.slice(9).join(',').trim();

                dialogues.push({
                    startTime: toSeconds(start),
                    endTime: toSeconds(end),
                    style,
                    text
                });
            }

            // 按时间分组合并双语
            const groupedMap = new Map();
            dialogues.forEach(d => {
                const key = `${d.startTime.toFixed(3)}-${d.endTime.toFixed(3)}`;
                if (!groupedMap.has(key)) {
                    groupedMap.set(key, {
                        startTime: d.startTime,
                        endTime: d.endTime,
                        texts: { orig: '', ts: '' },
                        karaoke: null
                    });
                }
                const group = groupedMap.get(key);
                if (d.style === 'orig') group.texts.orig = d.text;
                if (d.style === 'ts') group.texts.ts = d.text;
            });

            //解析卡拉OK并生成结果
            const result = [];
            groupedMap.forEach(group => {
                // 解析英文卡拉OK
                const parseKaraoke = (text) => {
                    const karaokeTag = /{\\k[f]?(\d+)}([^{}]+)/g;
                    let words = [];
                    let accTime = group.startTime;
                    let match;

                    while ((match = karaokeTag.exec(text)) !== null) {
                        const duration = match[0].includes('\\kf') 
                            ? parseInt(match[1]) * 0.01 
                            : parseInt(match[1]) * 0.1;
                        words.push({
                            text: match[2],
                            start: accTime,
                            end: accTime + duration
                        });
                        accTime += duration;
                    }
                    return words;
                };

                const enWords = parseKaraoke(group.texts.orig);
                result.push({
                    time: group.startTime,
                    texts: [
                        group.texts.orig.replace(/{.*?}/g, ''), // 英文
                        group.texts.ts.replace(/{.*?}/g, '')    // 中文
                    ],
                    words: enWords,
                    karaoke: enWords.length > 0
                });
            });

            return result.sort((a, b) => a.time - b.time);
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
                const baseName = encodeURIComponent(songTitle);

                // HTML内容检测方法
                const isInvalidContent = (text) => {
                    const trimmed = text.trim();
                    return trimmed.startsWith('<!doctype') ||
                        trimmed.startsWith('<html') ||
                        trimmed.includes('<div id="app">');
                };

                // 尝试获取 ASS
                let assText = "";
                try {
                    const response = await fetch(`/lyrics/${baseName}.ass`);
                    if (response.ok) {
                        assText = await response.text();
                        if (assText && !isInvalidContent(assText)) {
                            lyrics.value = parseASS(assText);
                            nextTick(() => scrollToActiveLyric(true));
                            return;
                        }
                    }
                } catch (error) {
                    console.warn("ASS请求异常:", error);
                }

                // 尝试获取 LRC
                try {
                    const lrcResponse = await fetch(`/lyrics/${baseName}.lrc`);
                    if (lrcResponse.ok) {
                        const lrcText = await lrcResponse.text();
                        if (!isInvalidContent(lrcText)) {
                            lyrics.value = parseLRC(lrcText);
                            nextTick(() => scrollToActiveLyric(true));
                            return;
                        }
                    }
                } catch (error) {
                    console.warn("LRC请求异常:", error);
                }

                // 两个格式都失败
                throw new Error("无有效歌词文件");
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

        const isWordActive = (word) => {
            const t = playerStore.currentTime;
            return t >= word.start && t < word.end;
        };

        const getASSKaraokeStyle = (word) => ({});

        return {
            lyrics,
            currentTime: playerStore.currentTime,
            isActive,
            loading,
            containerRef,
            isWordActive,
            getASSKaraokeStyle,
        };
    },
};
</script>

<style scoped></style>
