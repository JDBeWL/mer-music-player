<template>
  <div class="progress-container">
    <span>{{ formattedCurrentTime }}</span>
    <input ref="progressInput" type="range" :max="duration" :value="currentTime" @input="seek" class="progress-bar" />
    <span>{{ formattedDuration }}</span>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { usePlayerStore } from '@/stores/player'

const store = usePlayerStore()
const progressInput = ref(null)

// 按需引入ProgressBar的样式
onMounted(async () => {
  await import('@/assets/css/progressbar.css')
})

// 计算属性
const duration = computed(() => store.duration)
const currentTime = computed(() => store.currentTime)
const progressPercentage = computed(() => {
  return duration.value > 0
    ? (currentTime.value / duration.value) * 100
    : 0
})

// 时间格式化
const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

const formattedCurrentTime = computed(() => formatTime(currentTime.value))
const formattedDuration = computed(() => formatTime(duration.value))

const seek = (e) => {
  const seekTime = Number(e.target.value);
  store.seekToTime(seekTime);
}

watch(progressPercentage, (newVal) => {
  if (progressInput.value) {
    progressInput.value.style.setProperty('--progress', `${newVal}%`)
  }
})

onMounted(() => {
  if (progressInput.value) {
    progressInput.value.style.setProperty('--progress', '0%')
  }
})
</script>