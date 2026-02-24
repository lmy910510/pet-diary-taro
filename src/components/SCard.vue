<template>
  <div :class="['s-card', noPadding ? 's-card--no-padding' : '']" :style="customStyle">
    <div v-if="$slots.header" class="s-card__header">
      <slot name="header" />
    </div>
    <div v-if="$slots.default" class="s-card__content">
      <slot />
    </div>
    <div v-if="$slots.footer" class="s-card__footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  noPadding?: boolean
  customStyle?: string
}>()
</script>

<style lang="scss" scoped>
.s-card {
  background-color: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;

  &__header {
    padding: var(--space-4) var(--space-4) 0;
  }
  &__content {
    padding: var(--space-4);
  }
  &__footer {
    padding: 0 var(--space-4) var(--space-4);
  }
  &--no-padding {
    .s-card__header,
    .s-card__content,
    .s-card__footer {
      padding: 0;
    }
  }
}
</style>
