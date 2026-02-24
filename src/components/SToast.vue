<template>
  <Teleport to="body">
    <Transition name="toast">
      <div v-if="visible" class="toast" :class="`toast--${type}`">
        <span class="toast__icon">{{ icon }}</span>
        <span class="toast__text">{{ message }}</span>
      </div>
    </Transition>
  </Teleport>
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
    case 'info': return 'ℹ'
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

<style lang="scss" scoped>
.toast {
  position: fixed;
  top: 60px;
  left: 50%;
  transform: translateX(-50%);
  padding: var(--space-3) var(--space-5);
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-base);
  font-weight: var(--font-medium);
  z-index: 2000;
  box-shadow: var(--shadow-lg);

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
    font-size: var(--text-lg);
    font-weight: var(--font-bold);
  }
}

.toast-enter-active {
  animation: toastIn 0.3s ease;
}
.toast-leave-active {
  animation: toastOut 0.3s ease;
}

@keyframes toastIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

@keyframes toastOut {
  from {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
  to {
    opacity: 0;
    transform: translateX(-50%) translateY(-20px);
  }
}
</style>
