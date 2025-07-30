<template>
  <div class="volume-control-container">
    <!-- 悬浮音量滑块 -->
    <div class="volume-slider-container">
      <div class="volume-slider-wrapper">
        <input 
          type="range" 
          min="0" 
          max="1" 
          step="0.01" 
          v-model="volume" 
          @input="updateVolume" 
          class="volume-slider" 
          :class="{ 'firefox-slider': isFirefox }"
          orient="vertical" />
        <div class="volume-track" v-if="!isFirefox">
          <div class="volume-progress" :style="{ height: `${volume * 100}%` }"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from "vue";
import { usePlayerStore } from "@/stores/player";
import "@/assets/css/audio-volume-control.css"

const playerStore = usePlayerStore();
const previousVolume = ref(playerStore.volume);
const isMuted = ref(false);
const isFirefox = ref(false);

// 检测是否为Firefox
onMounted(() => {
  isFirefox.value = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
});

const volume = computed({
  get: () => playerStore.volume,
  set: (value) => playerStore.setVolume(value)
});

// 实时更新音量
const updateVolume = () => {
  playerStore.setVolume(volume.value);
  if (volume.value > 0) {
    isMuted.value = false;
    previousVolume.value = volume.value;
  }

  const volumeSlider = document.querySelector('.volume-slider');
  if (volumeSlider) {
    volumeSlider.style.setProperty('--volume', `${volume.value * 100}%`);
  }
};

onMounted(() => {
  nextTick(() => {
    const volumeSlider = document.querySelector('.volume-slider');
    if (volumeSlider) {
      volumeSlider.style.setProperty('--volume', `${volume.value * 100}%`);
    }
  });
});
</script>

<style scoped>

</style>
