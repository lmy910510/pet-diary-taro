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
    @tap="handleTap"
  >
    <view v-if="loading" class="s-btn__spinner" />
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

<style lang="scss">
@import '../styles/variables.scss';

.s-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: $space-2;
  border-radius: $radius-full;
  font-weight: $font-medium;
  font-family: $font-family;
  transition: all $transition-fast;
  border: 2px solid transparent;
  position: relative;
  outline: none;
  background: none;
  padding: 0;
  margin: 0;
  line-height: 1;

  &::after {
    border: none;
  }

  &--sm {
    height: 72rpx;
    padding: 0 $space-3;
    font-size: $text-sm;
    border-radius: $radius-full;
  }
  &--md {
    height: 88rpx;
    padding: 0 $space-4;
    font-size: $text-base;
    border-radius: $radius-full;
  }
  &--lg {
    height: 104rpx;
    padding: 0 $space-6;
    font-size: $text-lg;
    border-radius: $radius-full;
  }

  &--default {
    background-color: $foreground;
    color: $card;
  }
  &--primary {
    background-color: $primary;
    color: $primary-foreground;
  }
  &--ghost {
    background-color: transparent;
    color: $foreground;
  }
  &--outline {
    background-color: transparent;
    border-color: $border;
    color: $foreground;
  }

  &--disabled {
    opacity: 0.5;
  }
  &--loading {
    opacity: 0.7;
  }
  &--block {
    display: flex;
    width: 100%;
  }

  &__spinner {
    width: 32px;
    height: 32px;
    border: 4px solid currentColor;
    border-top-color: transparent;
    border-radius: 50%;
    animation: s-spin 0.6s linear infinite;
  }
}

@keyframes s-spin {
  to { transform: rotate(360deg); }
}
</style>
