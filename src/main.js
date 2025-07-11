import { createApp } from "vue";
import { createPinia } from "pinia";
import { usePlayerStore } from "./stores/player";
import App from "./App.vue";
import "./assets/css/main.css";
import { Buffer } from "buffer";
import * as mm from "music-metadata";

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
  try {
    // 从API获取播放列表数据
    const { getAllMusic } = await import("./api/graphql.js");
    const rawPlaylist = await getAllMusic();
    console.log("GraphQL数据源:", JSON.parse(JSON.stringify(rawPlaylist)));

    const enrichedPlaylist = await Promise.all(rawPlaylist.map(enrichTrack));
    playerStore.initialize(enrichedPlaylist);
    console.log(
      "播放器状态已初始化:",
      JSON.parse(JSON.stringify(playerStore.$state))
    );
  } catch (error) {
    console.error("初始化播放列表失败:", error);
    // 失败时尝试从本地加载
    try {
      const response = await fetch("/data/playlist.json");
      if (!response.ok)
        throw new Error(`加载playlist.json失败: ${response.status}`);

      const rawPlaylist = await response.json();
      console.log("本地JSON数据源:", JSON.parse(JSON.stringify(rawPlaylist)));

      const enrichedPlaylist = await Promise.all(rawPlaylist.map(enrichTrack));
      playerStore.initialize(enrichedPlaylist);
      console.log(
        "播放器状态已初始化:",
        JSON.parse(JSON.stringify(playerStore.$state))
      );
      console.log("已从本地JSON加载备用播放列表");
    } catch (fallbackError) {
      console.error("备选播放列表加载失败:", fallbackError);
    }
  }

  app.mount("#app");
}

initApp();
