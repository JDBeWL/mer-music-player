import { createApp } from "vue";
import { createPinia } from "pinia";
import { usePlayerStore } from "./stores/player";
import App from "./App.vue";
import "./assets/css/main.css";
import { parseBlob } from "music-metadata-browser";
import { Buffer } from "buffer";

const app = createApp(App);
const pinia = createPinia();
app.use(pinia);
window.Buffer = Buffer;
// 使用 localStorage 缓存封面与元数据
function getCacheKey(url) {
  return `metadata_cache_${url}`;
}

async function enrichTrack(track) {
  const cacheKey = getCacheKey(track.url);
  const cached = localStorage.getItem(cacheKey);
  if (cached) return JSON.parse(cached);

  try {
    const response = await fetch(track.url);
    const blob = await response.blob();

    const metadata = await parseBlob(blob);
    const picture = metadata.common.picture?.[0];
    const title = metadata.common.title || track.title;
    const artist = metadata.common.artist || track.artist;

    const runtimeCover = picture
      ? URL.createObjectURL(new Blob([picture.data], { type: picture.format }))
      : "";

    const enriched = {
      ...track,
      title,
      artist,
      runtimeCover,
    };

    localStorage.setItem(cacheKey, JSON.stringify(enriched));
    return enriched;
  } catch (e) {
    console.warn(`无法读取 ${track.url} 的元数据`, e);
    return { ...track, runtimeCover: "" };
  }
}

async function initApp() {
  const playerStore = usePlayerStore();
  try {
    // 从API获取播放列表数据，而不是本地JSON文件
    const { getAllMusic } = await import("./api/graphql.js");
    const rawPlaylist = await getAllMusic();
    
    // 继续处理元数据等内容
    const enrichedPlaylist = await Promise.all(rawPlaylist.map(enrichTrack));
    playerStore.initialize(enrichedPlaylist);
  } catch (error) {
    console.error("初始化播放列表失败:", error);
    // 失败时尝试从本地加载（作为备选方案）
    try {
      const response = await fetch("/src/assets/data/playlist.json");
      if (!response.ok)
        throw new Error(`加载playlist.json失败: ${response.status}`);

      const rawPlaylist = await response.json();
      const enrichedPlaylist = await Promise.all(rawPlaylist.map(enrichTrack));
      playerStore.initialize(enrichedPlaylist);
      console.log("已从本地JSON加载备用播放列表");
    } catch (fallbackError) {
      console.error("备选播放列表加载失败:", fallbackError);
    }
  }

  app.mount("#app");
}

initApp();
