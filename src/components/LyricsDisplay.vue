<template>
    <div class="lyrics-wrapper">
        <div class="lyrics-display" ref="containerRef">
            <div v-if="loading" class="loading">加载歌词中...</div>
            <div v-else-if="!lyrics.length" class="no-lyrics">暂无歌词</div>
            <div v-else>
                <div class="lyrics" v-for="(line, index) in lyrics" :key="index" :class="{ active: isActive(index) }">
                    <template v-if="line.karaoke && isActive(index)">
                        <!-- 卡拉OK -->
                        <p class="first-line">
                            <span v-for="(word, idx) in line.words" :key="idx"
                                :class="['karaoke-text', { 'active': isWordActive(word) }]"
                                :style="getASSKaraokeStyle(word)">
                                {{ word.text }}
                            </span>
                        </p>
                        <!-- 翻译部分 -->
                        <p class="last-line" v-if="line.texts[1]">{{ line.texts[1] }}</p>
                    </template>
                    <template v-else>
                        <!-- 非激活状态显示双语 -->
                        <p class="first-line" v-if="line.texts[0]">{{ line.texts[0] }}</p>
                        <p class="last-line" v-if="line.texts[1]">{{ line.texts[1] }}</p>
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
                // 解析卡拉OK
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
                        group.texts.orig.replace(/{.*?}/g, ''), //歌词
                        group.texts.ts.replace(/{.*?}/g, '')    //翻译
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

                // 调试原始歌曲标题
                console.log('加载歌词 - 原始歌曲标题:', songTitle);

                // 编码歌曲标题，但保留基本文件名结构
                let baseName;
                if (window.require) {
                    // Electron环境下不需要URL编码，直接使用原始标题
                    baseName = songTitle;
                    console.log('Electron环境 - 使用原始标题作为文件名基础:', baseName);
                } else {
                    // 浏览器环境下使用URL编码
                    baseName = encodeURIComponent(songTitle);
                    console.log('浏览器环境 - 编码后的文件名基础:', baseName);
                }

                // HTML内容检测方法
                const isInvalidContent = (text) => {
                    const trimmed = text.trim();
                    return trimmed.startsWith('<!doctype') ||
                        trimmed.startsWith('<html') ||
                        trimmed.includes('<div id="app">');
                };

                // 处理Electron环境
                const loadLyricFile = async (path) => {
                    console.log('=== 歌词加载开始 ===', path);
                    // 检查是否在Electron环境中
                    if (window.require) {
                        try {
                            const fs = window.require('fs');
                            const path_module = window.require('path');

                            // 解析文件名部分
                            const decodedPath = decodeURIComponent(path);
                            console.log('- URL解码后的路径:', decodedPath);

                            // 从路径中提取文件名
                            const pathParts = decodedPath.split('/');
                            const fileName = pathParts[pathParts.length - 1];
                            const fileNameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
                            const fileExt = fileName.substring(fileName.lastIndexOf('.'));
                            console.log('- 文件名:', fileName, '基本名:', fileNameWithoutExt, '扩展名:', fileExt);

                            // 标准化路径 - 提前定义，避免引用错误
                            const standardPath = decodedPath.startsWith('/') ? decodedPath.substring(1) : decodedPath;

                            // 获取应用程序路径
                            const appPath = process.cwd();
                            console.log('- 应用程序路径:', appPath);

                            // 创建可能的路径列表
                            const possiblePaths = [];

                            // 1. 直接使用路径
                            if (window.electronAPI) {
                                // 使用API中的方法
                                if (typeof window.electronAPI.getResourcePath === 'function') {
                                    const apiResourcePath = window.electronAPI.getResourcePath();
                                    possiblePaths.push(path_module.join(apiResourcePath, standardPath));
                                    possiblePaths.push(path_module.join(apiResourcePath, 'lyrics', fileName));
                                }

                                if (typeof window.electronAPI.getLocalPath === 'function') {
                                    const localPathBase = path_module.dirname(window.electronAPI.getLocalPath('/'));
                                    possiblePaths.push(path_module.join(localPathBase, standardPath));
                                    possiblePaths.push(path_module.join(localPathBase, 'lyrics', fileName));
                                }
                            }

                            // 2. 从当前目录尝试各种组合
                            const basePaths = [
                                appPath,
                                path_module.join(appPath, 'public'),
                                path_module.join(appPath, 'resources'),
                                path_module.join(appPath, 'resources', 'public'),
                                path_module.join(appPath, 'resources', 'app'),
                                path_module.join(appPath, 'resources', 'app.asar'),
                                path_module.join(appPath, 'resources', 'app.asar', 'public'),
                                path_module.join(appPath, '..'),
                                path_module.join(appPath, '..', 'public'),
                                path_module.join(appPath, '..', 'resources'),
                                path_module.join(appPath, '..', 'resources', 'public'),
                                path_module.dirname(appPath)
                            ];

                            // 测试播放列表文件是否存在，如果找到，将其所在目录优先加入搜索路径
                            try {
                                for (const basePath of basePaths) {
                                    const testPlaylistPath = path_module.join(basePath, 'data', 'playlist.json');
                                    if (fs.existsSync(testPlaylistPath)) {
                                        console.log('- 找到播放列表文件位置:', testPlaylistPath);
                                        // 将此路径放在列表前面，优先搜索
                                        basePaths.unshift(basePath);
                                        // 同时尝试playlist.json所在目录的父目录
                                        const parentDir = path_module.dirname(path_module.dirname(testPlaylistPath));
                                        basePaths.unshift(parentDir);
                                        break;
                                    }
                                }
                            } catch (e) {
                                console.log('- 查找播放列表位置时出错:', e.message);
                            }

                            // 为每个基础路径添加可能的歌词文件路径
                            basePaths.forEach(basePath => {
                                possiblePaths.push(path_module.join(basePath, standardPath));
                                possiblePaths.push(path_module.join(basePath, 'lyrics', fileName));
                                possiblePaths.push(path_module.join(basePath, 'public', 'lyrics', fileName));
                                possiblePaths.push(path_module.join(basePath, 'public', standardPath));
                            });

                            console.log('歌词调试信息：');
                            console.log('- 当前工作目录:', process.cwd());
                            console.log('- 原始路径:', path);
                            console.log('- 解码路径:', decodedPath);
                            console.log('- 标准化路径:', standardPath);
                            console.log('- 可能的路径数量:', possiblePaths.length);

                            // 打印前几个路径作为示例
                            for (let i = 0; i < Math.min(3, possiblePaths.length); i++) {
                                console.log(`- 示例路径[${i}]:`, possiblePaths[i]);
                            }

                            // 检查文件是否存在
                            let existsPath = null;

                            // 检查所有可能的路径
                            for (let i = 0; i < possiblePaths.length; i++) {
                                try {
                                    if (fs.existsSync(possiblePaths[i])) {
                                        console.log(`- 文件存在于路径[${i}]:`, possiblePaths[i]);
                                        existsPath = possiblePaths[i];
                                        break;
                                    }
                                } catch (e) {
                                    // 忽略错误，继续尝试下一个路径
                                }
                            }

                            if (!existsPath) {
                                // 尝试在各种可能的目录中搜索歌词文件
                                try {
                                    // 收集所有可能的歌词目录
                                    const lyricsPaths = new Set();

                                    // 使用basePaths构建可能的lyrics目录
                                    basePaths.forEach(basePath => {
                                        lyricsPaths.add(path_module.join(basePath, 'lyrics'));
                                        lyricsPaths.add(path_module.join(basePath, 'public', 'lyrics'));
                                    });

                                    // 转换为数组并过滤掉不存在的目录
                                    const validLyricsPaths = Array.from(lyricsPaths).filter(dir => {
                                        try {
                                            return fs.existsSync(dir);
                                        } catch (e) {
                                            return false;
                                        }
                                    });

                                    console.log('- 有效的歌词目录数:', validLyricsPaths.length);
                                    console.log('- 前几个歌词目录:', validLyricsPaths.slice(0, 3));

                                    // 查找第一个存在的歌词目录
                                    let lyricsDir = validLyricsPaths.length > 0 ? validLyricsPaths[0] : null;

                                    console.log('- 使用歌词目录:', lyricsDir);
                                    if (lyricsDir && fs.existsSync(lyricsDir)) {
                                        const files = fs.readdirSync(lyricsDir);
                                        console.log('- 歌词目录中的文件:', files);

                                        // 检查是否有类似文件名
                                        const baseName = decodedPath.split('/').pop().split('.')[0];
                                        console.log('- 寻找包含:', baseName);

                                        // 实现模糊匹配，处理特殊字符
                                        const cleanFileName = (name) => {
                                            // 移除中括号、小括号和特殊字符
                                            return name.replace(/[\[\]()（）【】<>《》]/g, '')
                                                      .replace(/\s+/g, '') // 移除空格
                                                      .toLowerCase();  // 转为小写
                                        };

                                        const cleanBaseName = cleanFileName(baseName);
                                        console.log('- 清理后的文件名:', cleanBaseName);

                                        // 尝试不同的匹配策略
                                        let possibleMatches = [];

                                        // 1. 精确文件名匹配
                                        const exactMatches = files.filter(f => 
                                            f.toLowerCase() === baseName.toLowerCase() + '.ass' || 
                                            f.toLowerCase() === baseName.toLowerCase() + '.lrc'
                                        );

                                        // 2. 包含文件名的匹配
                                        const containsMatches = files.filter(f => 
                                            f.toLowerCase().includes(baseName.toLowerCase())
                                        );

                                        // 3. 清理后的模糊匹配
                                        const fuzzyMatches = files.filter(f => {
                                            const cleanF = cleanFileName(f.split('.')[0]);
                                            return cleanF.includes(cleanBaseName) || 
                                                   cleanBaseName.includes(cleanF);
                                        });

                                        // 合并结果，优先使用更精确的匹配
                                        possibleMatches = [...exactMatches];
                                        containsMatches.forEach(m => {
                                            if (!possibleMatches.includes(m)) possibleMatches.push(m);
                                        });
                                        fuzzyMatches.forEach(m => {
                                            if (!possibleMatches.includes(m)) possibleMatches.push(m);
                                        });

                                        console.log('- 匹配策略结果:');
                                        console.log('  - 精确匹配:', exactMatches);
                                        console.log('  - 包含匹配:', containsMatches);
                                        console.log('  - 模糊匹配:', fuzzyMatches);
                                        console.log('  - 最终匹配列表:', possibleMatches);

                                        if (possibleMatches.length > 0) {
                                            console.log('- 选择匹配文件:', possibleMatches[0]);
                                            // 使用第一个匹配项
                                            existsPath = path_module.join(lyricsDir, possibleMatches[0]);
                                        }
                                    }
                                } catch (dirError) {
                                    console.error('列出歌词目录失败:', dirError);
                                }
                            }

                            if (existsPath) {
                                try {
                                    const data = fs.readFileSync(existsPath, 'utf-8');
                                    console.log('- 成功读取文件内容, 长度:', data.length);
                                    console.log('=== 歌词加载成功 ===');
                                    return { ok: true, data };
                                } catch (readErr) {
                                    console.error('- 读取文件失败:', readErr);
                                    return { ok: false, error: readErr };
                                }
                            } else {
                                console.warn('- 所有尝试路径都不存在文件');
                                console.log('=== 歌词加载失败 ===');
                                return { ok: false };
                            }
                        } catch (error) {
                            console.error('Electron环境读取歌词文件失败:', error);
                            console.log('=== 歌词加载出错 ===');
                            return { ok: false, error };
                        }
                    }

                    // 浏览器环境
                    try {
                        const response = await fetch(path);
                        if (response.ok) {
                            const text = await response.text();
                            return { ok: true, data: text };
                        }
                        return { ok: false };
                    } catch (error) {
                        console.warn(`浏览器环境请求异常(${path}):`, error);
                        return { ok: false, error };
                    }
                };

                // 直接列出歌词目录所有文件，寻找匹配
                if (window.require) {
                    try {
                        const fs = window.require('fs');
                        const path_module = window.require('path');
                        const lyricsDir = path_module.join(process.cwd(), 'public', 'lyrics');

                        if (fs.existsSync(lyricsDir)) {
                            const files = fs.readdirSync(lyricsDir);
                            console.log('歌词目录中的所有文件:', files);

                            // 清理歌曲标题用于匹配
                            const cleanTitle = (title) => {
                                return title.replace(/[\[\]［］()（）【】<>《》]/g, '') // 添加全角中文括号
                                           .replace(/\s+/g, '')
                                           .toLowerCase();
                            };

                            const cleanBaseName = cleanTitle(baseName);
                            console.log('清理后的歌曲标题:', cleanBaseName);

                            // 调试信息
                            console.log('===== 详细的文件匹配调试 =====');
                            console.log('查找的文件名:', `${baseName}.ass 或 ${baseName}.lrc`);

                            // 1. 尝试完全一致匹配（不区分大小写）
                            let matchedFile = files.find(f => 
                                f.toLowerCase() === `${baseName}.ass`.toLowerCase() || 
                                f.toLowerCase() === `${baseName}.lrc`.toLowerCase()
                            );
                            console.log('完全匹配结果:', matchedFile || '无匹配');

                            // 2. 移除编号比较
                            if (!matchedFile) {
                                const baseNameWithoutNum = baseName.replace(/^\d+\.\s*/, '');
                                matchedFile = files.find(f => {
                                    const fileNameWithoutExt = f.split('.').slice(0, -1).join('.');
                                    const fileNameWithoutNum = fileNameWithoutExt.replace(/^\d+\.\s*/, '');
                                    return fileNameWithoutNum.toLowerCase() === baseNameWithoutNum.toLowerCase() &&
                                          (f.endsWith('.ass') || f.endsWith('.lrc'));
                                });
                                console.log('移除编号比较结果:', matchedFile || '无匹配', 
                                          '(查找:', baseNameWithoutNum, ')');
                            }

                            // 3. 尝试包含匹配
                            if (!matchedFile) {
                                matchedFile = files.find(f => {
                                    const fileName = f.toLowerCase();
                                    const result = fileName.includes(baseName.toLowerCase()) && 
                                           (fileName.endsWith('.ass') || fileName.endsWith('.lrc'));
                                    console.log(`- 包含匹配检查: ${f} 包含 ${baseName}? ${result}`);
                                    return result;
                                });
                                console.log('包含匹配结果:', matchedFile || '无匹配');
                            }

                            // 4. 尝试反向包含匹配
                            if (!matchedFile) {
                                matchedFile = files.find(f => {
                                    if (!f.endsWith('.ass') && !f.endsWith('.lrc')) return false;
                                    const fileNameWithoutExt = f.split('.').slice(0, -1).join('.').toLowerCase();
                                    const result = baseName.toLowerCase().includes(fileNameWithoutExt);
                                    console.log(`- 反向包含检查: ${baseName} 包含 ${fileNameWithoutExt}? ${result}`);
                                    return result;
                                });
                                console.log('反向包含匹配结果:', matchedFile || '无匹配');
                            }

                            // 5. 最后尝试模糊匹配
                            if (!matchedFile) {
                                files.forEach(f => {
                                    if (!f.endsWith('.ass') && !f.endsWith('.lrc')) return;
                                    const cleanFileName = cleanTitle(f.split('.').slice(0, -1).join('.'));
                                    console.log(`- 模糊匹配: "${cleanFileName}" 与 "${cleanBaseName}"`);
                                });

                                matchedFile = files.find(f => {
                                    if (!f.endsWith('.ass') && !f.endsWith('.lrc')) return false;
                                    const cleanFileName = cleanTitle(f.split('.').slice(0, -1).join('.'));
                                    const result = cleanFileName.includes(cleanBaseName) || 
                                           cleanBaseName.includes(cleanFileName);
                                    console.log(`- 模糊匹配检查: "${cleanFileName}" 与 "${cleanBaseName}"? ${result}`);
                                    return result;
                                });
                                console.log('模糊匹配结果:', matchedFile || '无匹配');
                            }

                            // 6. 直接字符串相似度比较
                            if (!matchedFile) {
                                let bestMatch = null;
                                let bestScore = -1;

                                // 简单的相似度计算函数（最长公共子串长度）
                                const similarity = (s1, s2) => {
                                    s1 = s1.toLowerCase();
                                    s2 = s2.toLowerCase();
                                    let count = 0;
                                    for (let i = 0; i < Math.min(s1.length, s2.length); i++) {
                                        if (s1[i] === s2[i]) count++;
                                    }
                                    return count / Math.max(s1.length, s2.length);
                                };

                                files.forEach(f => {
                                    if (!f.endsWith('.ass') && !f.endsWith('.lrc')) return;
                                    const fileNameWithoutExt = f.split('.').slice(0, -1).join('.');
                                    const score = similarity(fileNameWithoutExt, baseName);
                                    console.log(`- 相似度比较: "${fileNameWithoutExt}" 与 "${baseName}" = ${score.toFixed(2)}`);

                                    if (score > bestScore) {
                                        bestScore = score;
                                        bestMatch = f;
                                    }
                                });

                                // 只有相似度足够高才使用
                                if (bestScore > 0.5) {
                                    matchedFile = bestMatch;
                                    console.log('相似度匹配结果:', matchedFile, `(相似度: ${bestScore.toFixed(2)})`);
                                }
                            }

                            if (matchedFile) {
                                console.log('找到匹配歌词文件:', matchedFile);
                                const filePath = path_module.join(lyricsDir, matchedFile);

                                try {
                                    const content = fs.readFileSync(filePath, 'utf-8');
                                    console.log('成功读取歌词文件内容，长度:', content.length, '文件:', matchedFile);

                                    // 打印文件内容前20行用于调试
                                    const contentPreview = content.split('\n').slice(0, 20).join('\n');
                                    console.log('歌词文件内容预览:', contentPreview);

                                    try {
                                        if (matchedFile.endsWith('.ass')) {
                                            const parsedLyrics = parseASS(content);
                                            console.log('ASS解析结果:', parsedLyrics.length, '行歌词');

                                            if (parsedLyrics.length > 0) {
                                                lyrics.value = parsedLyrics;
                                                console.log('成功解析ASS歌词');
                                                nextTick(() => scrollToActiveLyric(true));
                                                return;
                                            } else {
                                                console.error('ASS歌词解析结果为空');
                                            }
                                        } else if (matchedFile.endsWith('.lrc')) {
                                            const parsedLyrics = parseLRC(content);
                                            console.log('LRC解析结果:', parsedLyrics.length, '行歌词');

                                            if (parsedLyrics.length > 0) {
                                                lyrics.value = parsedLyrics;
                                                console.log('成功解析LRC歌词');
                                                nextTick(() => scrollToActiveLyric(true));
                                                return;
                                            } else {
                                                console.error('LRC歌词解析结果为空');
                                            }
                                        }
                                    } catch (parseError) {
                                        console.error('解析歌词文件失败:', parseError);
                                    }
                                } catch (readError) {
                                    console.error('读取歌词文件失败:', readError);
                                }
                            } else {
                                console.log('在歌词目录中未找到匹配的文件');
                            }
                        }
                    } catch (error) {
                        console.error('搜索歌词目录失败:', error);
                    }
                }

                // 如果Electron环境下的文件搜索失败，回退到传统方法

                // 尝试获取ASS
                try {
                    const assPath = `/lyrics/${baseName}.ass`;
                    const assResult = await loadLyricFile(assPath);

                    if (assResult.ok) {
                        const assText = assResult.data;
                        if (assText && !isInvalidContent(assText)) {
                            console.log(`成功加载ASS歌词: ${baseName}`);
                            lyrics.value = parseASS(assText);
                            nextTick(() => scrollToActiveLyric(true));
                            return;
                        }
                    }
                } catch (error) {
                    console.warn("ASS处理异常:", error);
                }

                // 尝试获取LRC
                try {
                    const lrcPath = `/lyrics/${baseName}.lrc`;
                    const lrcResult = await loadLyricFile(lrcPath);

                    if (lrcResult.ok) {
                        const lrcText = lrcResult.data;
                        if (!isInvalidContent(lrcText)) {
                            console.log(`成功加载LRC歌词: ${baseName}`);
                            lyrics.value = parseLRC(lrcText);
                            nextTick(() => scrollToActiveLyric(true));
                            return;
                        }
                    }
                } catch (error) {
                    console.warn("LRC处理异常:", error);
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
            return (t >= word.start && t < word.end) || (t >= word.end);
        };

        const getASSKaraokeStyle = (word) => {
            const t = playerStore.currentTime;
            // 如果当前时间超过单词结束时间，保持100%进度
            if (t >= word.end) {
                return { '--progress': '100%' };
            }
            // 如果当前时间在单词时间范围内，计算进度百分比
            else if (t >= word.start) {
                const progress = ((t - word.start) / (word.end - word.start)) * 100;
                return { '--progress': `${progress}%` };
            }
            // 如果还未到单词时间，进度为0
            return { '--progress': '0%' };
        };

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
