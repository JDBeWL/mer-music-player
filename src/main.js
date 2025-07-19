import { createApp } from "vue";
import { createPinia } from "pinia";
import { usePlayerStore } from "./stores/player";
import App from "./App.vue";
import "./assets/css/main.css";
import { Buffer } from "buffer";
import * as mm from "music-metadata";

if (window.require) {
  const { ipcRenderer } = window.require('electron')
  const path = window.require('path')
  const fs = window.require('fs')

  // 处理本地文件路径
  window.electronAPI = {
    getLocalPath: (relativePath) => {
      // 确保相对路径处理正确
      if (relativePath.startsWith('/')) {
        relativePath = relativePath.substring(1)
      }
      const fullPath = path.join(process.cwd(), 'public', relativePath)
      console.log(`将相对路径 ${relativePath} 转换为绝对路径: ${fullPath}`)
      return fullPath
    },
    fileExists: (filePath) => {
      try {
        return fs.existsSync(filePath)
      } catch (err) {
        console.error(`检查文件存在失败: ${filePath}`, err)
        return false
      }
    }
  }

  console.log('Electron环境初始化完成，当前工作目录:', process.cwd())
}

const app = createApp(App);
const pinia = createPinia();
app.use(pinia);
window.Buffer = Buffer;
function getCacheKey(url) {
  return `metadata_cache_${url}`;
}

// 清除缓存的方法
function clearMetadataCache() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith("metadata_cache_")) {
      keys.push(key);
    }
  }
  keys.forEach((key) => localStorage.removeItem(key));
  console.log(`已清除 ${keys.length} 项元数据缓存`);
}

if (window.location.search.includes("clearCache=true")) {
  clearMetadataCache();
}

async function enrichTrack(track) {
  const playerStore = usePlayerStore();

  // 检查URL是否有效
  if (!track.url) {
    console.warn(`歌曲 ${track.title} 没有有效的URL`);
    return { ...track, runtimeCover: track.cover || "" };
  }

  if (track.url.includes("api.paugram.com") || track.url.includes("netease")) {
    console.log(`检测到外部API URL: ${track.url}，跳过元数据提取`);
    return { ...track, runtimeCover: track.cover || "" };
  }

  const cacheKey = getCacheKey(track.url);
  const cached = localStorage.getItem(cacheKey);
  // 检查缓存的数据是否包含Cover，如果没有则不使用缓存
  if (cached) {
    const parsedCache = JSON.parse(cached);
    if (parsedCache.cover === track.cover && track.cover !== "") {
      return parsedCache;
    }
  }

  try {
    const response = await fetch(track.url);
    const title = track.title;
    const artist = track.artist;

    // 提取封面
    let coverToUse =
      track.cover ||
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAHESMIAAAAABJRU5ErkJggg==";

    try {
      const arrayBuffer = await response.clone().arrayBuffer();
      const metadata = await mm.parseBuffer(new Uint8Array(arrayBuffer));

      // 提取封面图片
      if (metadata.common.picture && metadata.common.picture.length > 0) {
        const picture = metadata.common.picture[0];
        const base64String = `data:${picture.format};base64,${Buffer.from(
          picture.data
        ).toString("base64")}`;
        coverToUse = base64String;
        console.log(`从音频文件中提取到封面图片: ${track.url}`);
      } else {
        console.log(`音频文件中没有封面图片: ${track.url}`);
        coverToUse =
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAHESMIAAAAABJRU5ErkJggg==";
      }
    } catch (metadataError) {
      console.warn(`提取音频文件封面失败: ${track.url}`, metadataError);
      coverToUse =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAHESMIAAAAABJRU5ErkJggg==";
    }

    const enriched = {
      ...track,
      title,
      artist,
      runtimeCover: coverToUse || "",
    };

    // 更新runtimeCover
    if (playerStore.currentSong && playerStore.currentSong.id === track.id) {
      playerStore.updateCurrentSongCover(coverToUse);
      const isExtractedCover = coverToUse !== track.cover;
      console.log(
        `已通过Pinia Store更新封面: ${coverToUse}`,
        isExtractedCover ? "(使用了从音频文件提取的封面)" : "(使用原始封面)"
      );
    }

    localStorage.setItem(cacheKey, JSON.stringify(enriched));
    return enriched;
  } catch (e) {
    console.warn(`无法读取 ${track.url} 的元数据`, e);
    let fallbackCover = track.cover || "";

    // 主提取流程出错尝试单独提取Cover
    try {
      console.log(`尝试单独提取 ${track.url} 的封面...`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      // 声明跨域请求
      const response = await fetch(track.url, {
        signal: controller.signal,
        mode: "cors",
        cache: "no-cache",
        headers: {
          Accept: "audio/*",
        },
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`HTTP请求不正确: ${response.status}`, track.url);
      }

      const arrayBuffer = await response.arrayBuffer();
      const metadata = await mm.parseBuffer(new Uint8Array(arrayBuffer));

      if (metadata.common.picture && metadata.common.picture.length > 0) {
        const picture = metadata.common.picture[0];
        const base64String = `data:${picture.format};base64,${Buffer.from(
          picture.data
        ).toString("base64")}`;
        fallbackCover = base64String;
        console.log(`成功从音频文件中提取到封面图片: ${track.url}`);
      } else {
        console.warn(`音频文件中没有封面图片: ${track.url}`);
        fallbackCover =
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAHESMIAAAAABJRU5ErkJggg==";
      }
    } catch (metadataError) {
      console.warn(
        `提取音频文件封面失败: ${track.url}`,
        metadataError.name,
        metadataError.message
      );
      fallbackCover =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAHESMIAAAAABJRU5ErkJggg==";
    }

    // 前面逻辑出错依然尝试更新封面
    if (playerStore.currentSong && playerStore.currentSong.id === track.id) {
      const validFallback = fallbackCover || DEFAULT_COVER;

      playerStore.updateCurrentSongCover(validFallback);
      console.log("逻辑错误情况下已通过Pinia Store更新封面:", validFallback);
      playerStore.selectSong({
        ...playerStore.currentSong,
        runtimeCover: validFallback,
      });
    }

    // 设置封面
    const enrichedTrack = {
      ...track,
      runtimeCover: fallbackCover || DEFAULT_COVER,
    };

    // 缓存结果
    localStorage.setItem(cacheKey, JSON.stringify(enrichedTrack));
    return enrichedTrack;
  }
}

async function initApp() {
  const playerStore = usePlayerStore();
  // 本地加载
  try {
    // 添加时间戳防止浏览器缓存
    const timestamp = Date.now();
    let response;

    // 检查是否在Electron环境中
    if (window.require) {
      const fs = window.require('fs');
      const path = window.require('path');

      // 使用正确的资源路径 - 直接使用硬编码路径优先级方案
      let resourcePath;

      // 直接使用process.cwd()或硬编码路径
      try {
        // 确保window.electronAPI存在
        if (!window.electronAPI) {
          window.electronAPI = {};
          console.log('创建window.electronAPI对象');
        }

        // 直接添加getResourcePath方法如果不存在
        if (!window.electronAPI.getResourcePath) {
          window.electronAPI.getResourcePath = function() {
            return process.cwd ? path.join(process.cwd(), 'public') : './public';
          };
          console.log('在前端动态添加getResourcePath方法');
        }

        // 尝试各种可能的资源路径位置
        const possibilities = [
          // 使用添加的getResourcePath
          window.electronAPI.getResourcePath(),
          // 如果有getLocalPath，使用它
          typeof window.electronAPI.getLocalPath === 'function' 
            ? path.dirname(window.electronAPI.getLocalPath('/')) : null,
          // 尝试获取当前工作目录
          process.cwd ? path.join(process.cwd(), 'public') : null,
          // 尝试常见的打包位置
          path.join(process.cwd(), 'resources', 'public'),
          path.join(process.cwd(), '..', 'resources', 'public'),
          // 最后的回退
          './public'
        ].filter(Boolean);

        console.log('尝试的可能路径:', possibilities);

        // 尝试每个可能的路径直到找到一个存在的
        for (const possiblePath of possibilities) {
          try {
            const testFile = path.join(possiblePath, 'data', 'playlist.json');
            console.log('测试路径:', testFile);
            if (fs.existsSync(testFile)) {
              resourcePath = possiblePath;
              console.log('找到有效的资源路径:', resourcePath);
              break;
            }
          } catch (e) {
            console.log('路径测试失败:', e.message);
          }
        }

        // 如果还没找到，使用第一个可能的路径
        if (!resourcePath && possibilities.length > 0) {
          resourcePath = possibilities[0];
          console.log('使用备用资源路径:', resourcePath);
        }
      } catch (e) {
        console.error('确定资源路径时出错:', e);
        resourcePath = './public';
      }

      const playlistPath = path.join(resourcePath, 'data', 'playlist.json');
      console.log('Electron环境：从路径加载播放列表', playlistPath);

      try {
        const data = fs.readFileSync(playlistPath, 'utf-8');
        const rawPlaylist = JSON.parse(data);
        // 调整文件路径为绝对路径
        const processedPlaylist = rawPlaylist.map(track => {
          return {
            ...track,
            url: track.url.startsWith('/') ? path.join(resourcePath, track.url.slice(1)) : track.url,
            cover: track.cover.startsWith('/') ? path.join(resourcePath, track.cover.slice(1)) : track.cover
          }
        });
        const enrichedPlaylist = await Promise.all(processedPlaylist.map(enrichTrack));
        playerStore.initialize(enrichedPlaylist);
        console.log('播放器状态已初始化(Electron):', JSON.parse(JSON.stringify(playerStore.$state)));
        console.log("已从本地文件系统加载播放列表");
        app.mount("#app");
        return; // 提前返回，避免继续执行下面的代码
      } catch (electronError) {
        console.error("Electron环境下加载播放列表失败:", electronError);
      }
    }

    // 浏览器环境或Electron加载失败后的备用方案
    response = await fetch(`/data/playlist.json?_=${timestamp}`);
    if (!response.ok)
      throw new Error(`加载playlist.json失败: ${response.status}`);

    const rawPlaylist = await response.json();
    const enrichedPlaylist = await Promise.all(rawPlaylist.map(enrichTrack));
    playerStore.initialize(enrichedPlaylist);
    console.log('播放器状态已初始化(Web):', JSON.parse(JSON.stringify(playerStore.$state)));
    console.log("已从网络加载备用播放列表");
  } catch (fallbackError) {
    console.error("所有播放列表加载方式均失败:", fallbackError);
  }


  app.mount("#app");
}

initApp();
