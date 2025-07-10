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
import { createMusic } from "@/api/graphql";

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
.playlist-add {
  background-color: #fff;
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  max-width: 500px;
  width: 60vw;
  overflow: hidden;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background-color: #f5f5f5;
}

.header h1 {
  margin: 0;
  font-size: 1.25rem;
  color: #333;
}

.close-btn {
  width: 24px;
  height: 24px;
  position: relative;
  cursor: pointer;
}

.close-btn::before,
.close-btn::after {
  content: "";
  position: absolute;
  width: 18px;
  height: 2px;
  background-color: #333;
  top: 50%;
  left: 50%;
}

.close-btn::before {
  transform: translate(-50%, -50%) rotate(45deg);
}

.close-btn::after {
  transform: translate(-50%, -50%) rotate(-45deg);
}

.content {
  padding: 20px;
}

.add-music-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-group label {
  font-weight: 500;
  font-size: 1rem;
  color: #333;
}

.form-group input {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 10px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.form-group input:focus {
  border-color: #4a90e2;
  outline: none;
}

.form-group small {
  font-size: 12px;
  color: #666;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 8px;
}

.btn-cancel,
.btn-submit {
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: background-color 0.2s smooth;
}

.btn-cancel {
  background-color: #f5f5f5;
  color: #333;
}

.btn-cancel:hover {
  background-color: #e0e0e0;
}

.btn-submit {
  background-color: #2196f3;
  color: white;
}

.btn-submit:hover {
  background-color: #3a80d2;
}

.btn-submit:disabled {
  background-color: #a0c4f0;
  cursor: not-allowed;
}

.error-message {
  margin-top: 16px;
  padding: 10px;
  background-color: #ffe6e6;
  border: 1px solid #ffcccc;
  border-radius: 4px;
  color: #d33;
  font-size: 14px;
}

.success-message {
  margin-top: 16px;
  padding: 10px;
  background-color: #e6ffe6;
  border: 1px solid #ccffcc;
  border-radius: 4px;
  color: #3d8a3d;
  font-size: 14px;
}
</style>
