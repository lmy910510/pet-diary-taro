<template>
  <button
    :class="[
      's-btn',
      `s-btn--${variant}`,
      `s-btn--${size}`,
      disabled ? 's-btn--disabled' : '',
      loading ? 's-btn--loading' : '',
      block ? 's-btn--block' : ''
    ]"
    :disabled="disabled || loading"
    @click="handleTap"
  >
    <span v-if="loading" class="s-btn__spinner" />
    <slot />
  </button>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  variant?: 'default' | 'primary' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  block?: boolean
}>(), {
  variant: 'default',
  size: 'md',
  disabled: false,
  loading: false,
  block: false
})

const emit = defineEmits<{
  tap: []
}>()

function handleTap() {
  if (!props.disabled && !props.loading) {
    emit('tap')
  }
}
</script>

<style lang="scss" scoped>
.s-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  border-radius: var(--radius);
  font-weight: var(--font-medium);
  font-family: var(--font-family);
  transition: all var(--transition-fast);
  border: 1px solid transparent;
  position: relative;
  cursor: pointer;
  outline: none;

  &--sm {
    height: 32px;
    padding: 0 var(--space-3);
    font-size: var(--text-sm);
    border-radius: var(--radius-sm);
  }
  &--md {
    height: 40px;
    padding: 0 var(--space-4);
    font-size: var(--text-base);
  }
  &--lg {
    height: 48px;
    padding: 0 var(--space-6);
    font-size: var(--text-lg);
  }

  &--default {
    background-color: var(--foreground);
    color: var(--card);
    &:hover { opacity: 0.85; }
  }
  &--primary {
    background-color: var(--primary);
    color: var(--primary-foreground);
    &:hover { background-color: var(--primary-hover); }
  }
  &--ghost {
    background-color: transparent;
    color: var(--foreground);
    &:hover { background-color: var(--muted); }
  }
  &--outline {
    background-color: transparent;
    border-color: var(--border);
    color: var(--foreground);
    &:hover { background-color: var(--muted); }
  }

  &--disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  &--loading {
    opacity: 0.7;
    cursor: wait;
  }
  &--block {
    display: flex;
    width: 100%;
  }

  &__spinner {
    width: 16px;
    height: 16px;
    border: 2px solid currentColor;
    border-top-color: transparent;
    border-radius: 50%;
    animation: s-spin 0.6s linear infinite;
  }
}

@keyframes s-spin {
  to { transform: rotate(360deg); }
}
</style>
