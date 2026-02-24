<template>
  <span
    :class="['s-badge', `s-badge--${variant}`]"
    :style="customColor ? `background-color:${customColor};color:#fff;border-color:${customColor};` : ''"
  >
    <slot />
  </span>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'default' | 'secondary' | 'outline'
  customColor?: string
}>(), {
  variant: 'default',
  customColor: ''
})
</script>

<style lang="scss" scoped>
.s-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 22px;
  padding: 0 var(--space-2);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  line-height: 1;
  border-radius: var(--radius-full);
  white-space: nowrap;
  border: 1px solid transparent;

  &--default {
    background-color: var(--foreground);
    color: var(--card);
  }
  &--secondary {
    background-color: var(--muted);
    color: var(--muted-foreground);
  }
  &--outline {
    background-color: transparent;
    border-color: var(--border);
    color: var(--foreground);
  }
}
</style>
