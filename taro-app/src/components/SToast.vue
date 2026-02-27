<template>
  <view v-if="visible" class="toast" :class="`toast--${type}`">
    <text class="toast__icon">{{ icon }}</text>
    <text class="toast__text">{{ message }}</text>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const visible = ref(false)
const message = ref('')
const type = ref<'success' | 'error' | 'info'>('success')

const icon = computed(() => {
  switch (type.value) {
    case 'success': return '✓'
    case 'error': return '✕'
    case 'info': return 'i'
  }
})

function show(msg: string, t: 'success' | 'error' | 'info' = 'success', duration = 2000) {
  message.value = msg
  type.value = t
  visible.value = true
  setTimeout(() => {
    visible.value = false
  }, duration)
}

defineExpose({ show })
</script>

<style lang="scss">
@import '../styles/variables.scss';

.toast {
  position: fixed;
  top: 120px;
  left: 50%;
  transform: translateX(-50%);
  padding: $space-3 $space-5;
  border-radius: $radius;
  display: flex;
  align-items: center;
  gap: $space-2;
  font-size: $text-base;
  font-weight: $font-medium;
  z-index: 10200; /* 高于所有弹层 */
  box-shadow: $shadow-lg;

  &--success {
    background-color: #E0F2F1;
    color: #00796B;
  }
  &--error {
    background-color: #FFEBEE;
    color: #C62828;
  }
  &--info {
    background-color: #E3F2FD;
    color: #1565C0;
  }

  &__icon {
    font-size: $text-lg;
    font-weight: 700;
  }
}
</style>
