<template>
  <div class="playlist-add">
    <div class="header">
      <h1>添加音乐</h1>
      <div class="close-btn" @click="$emit('close')"></div>
    </div>
    <div class="content">
      <form @submit.prevent="submitForm" class="add-music-form">
        <div class="form-group">
          <label for="title">歌曲名称</label>
          <input type="text" id="title" v-model="form.title" required />
        </div>

        <div class="form-group">
          <label for="artist">歌手</label>
          <input type="text" id="artist" v-model="form.artist" required />
        </div>

        <div class="form-group">
          <label for="url">音乐文件路径</label>
          <input type="text" id="url" v-model="form.url" required />
          <small>输入相对路径，例如：/music/my-song.mp3</small>
        </div>

        <div class="form-group">
          <label for="cover">封面图片路径</label>
          <input type="text" id="cover" v-model="form.cover" />
          <small>输入相对路径，例如：/covers/my-cover.jpg</small>
        </div>

        <div class="form-actions">
          <button type="button" class="btn-cancel" @click="$emit('close')">
            取消
          </button>
          <button type="submit" class="btn-submit" :disabled="isSubmitting">
            {{ isSubmitting ? "添加中..." : "添加歌曲" }}
          </button>
        </div>

        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>

        <div v-if="successMessage" class="success-message">
          {{ successMessage }}
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from "vue";
import { usePlayerStore } from "@/stores/player";
import "@/assets/css/playlist-add.css"
// import { createMusic } from "@/api/graphql";
// 暂时禁用，后面会使用RESTful的写法或者其他的nodejs控制方法设计json或者后端请求

const emit = defineEmits(["close", "music-added"]);

const playerStore = usePlayerStore();

const form = reactive({
  title: "",
  artist: "",
  url: "",
  cover: "",
});

const isSubmitting = ref(false);
const errorMessage = ref("");
const successMessage = ref("");

const submitForm = async () => {
  try {
    // 清除之前的消息
    errorMessage.value = "";
    successMessage.value = "";
    isSubmitting.value = true;

    const newMusic = await createMusic({
      title: form.title,
      artist: form.artist,
      url: form.url,
      cover: form.cover || "",
    });

    // 添加到播放列表
    playerStore.playlist.push({
      ...newMusic,
      duration: 0,
    });
    successMessage.value = `音乐 "${form.title}" 已成功添加！`;

    // 清空表单
    form.title = "";
    form.artist = "";
    form.url = "";
    form.cover = "";

    // 通知父组件音乐已添加
    emit("music-added", newMusic);
    setTimeout(() => {
      emit("close");
    }, 2000);
  } catch (error) {
    console.error("添加音乐失败:", error);
    errorMessage.value = `添加失败: ${
      error.message || "未知错误"
    }，请检查所有字段并重试。`;
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<style scoped>

</style>
