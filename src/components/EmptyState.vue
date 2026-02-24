<template>
  <div class="empty-state">
    <div class="empty-state__icon">
      <span class="empty-state__emoji">{{ icon }}</span>
    </div>
    <span class="empty-state__title">{{ title }}</span>
    <span class="empty-state__desc">{{ description }}</span>
    <div v-if="actionText" class="empty-state__action">
      <SButton variant="primary" size="md" @tap="$emit('action')">
        {{ actionText }}
      </SButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import SButton from './SButton.vue'

withDefaults(defineProps<{
  icon?: string
  title?: string
  description?: string
  actionText?: string
}>(), {
  icon: '📋',
  title: '暂无内容',
  description: '',
  actionText: ''
})

defineEmits<{
  action: []
}>()
</script>

<style lang="scss" scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-10) var(--space-6);
  gap: var(--space-3);

  &__icon {
    width: 64px;
    height: 64px;
    border-radius: var(--radius-full);
    background-color: var(--muted);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: var(--space-2);
  }

  &__emoji {
    font-size: 28px;
  }

  &__title {
    font-size: var(--text-lg);
    font-weight: var(--font-semibold);
    color: var(--foreground);
  }

  &__desc {
    font-size: var(--text-base);
    color: var(--muted-foreground);
    text-align: center;
    line-height: var(--leading-relaxed);
  }

  &__action {
    margin-top: var(--space-4);
  }
}
</style>
