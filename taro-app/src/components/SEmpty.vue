<template>
  <view class="s-empty">
    <view class="s-empty__icon">
      <image class="s-empty__image" :src="iconSrc" mode="aspectFit" />
    </view>
    <text class="s-empty__title">{{ title }}</text>
    <text v-if="description" class="s-empty__desc">{{ description }}</text>
    <view v-if="actionText" class="s-empty__action" @tap="emit('action')">
      <text class="s-empty__action-text">{{ actionText }}</text>
    </view>
    <slot />
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

// Base64 编码的空状态 SVG 图标
const EMPTY_ICONS: Record<string, string> = {
  empty: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 24 24' fill='none' stroke='%23A8A29E' stroke-width='1' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M21 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v3'/%3E%3Cpath d='M21 16v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3'/%3E%3Cpath d='M4 12H2'/%3E%3Cpath d='M10 12H8'/%3E%3Cpath d='M16 12h-2'/%3E%3Cpath d='M22 12h-2'/%3E%3C/svg%3E`,
  search: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 24 24' fill='none' stroke='%23A8A29E' stroke-width='1' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cpath d='m21 21-4.3-4.3'/%3E%3C/svg%3E`,
  record: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 24 24' fill='none' stroke='%23A8A29E' stroke-width='1' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z'/%3E%3Cpolyline points='14 2 14 8 20 8'/%3E%3Cline x1='16' x2='8' y1='13' y2='13'/%3E%3Cline x1='16' x2='8' y1='17' y2='17'/%3E%3Cline x1='10' x2='8' y1='9' y2='9'/%3E%3C/svg%3E`,
}

const props = withDefaults(defineProps<{
  icon?: string
  title?: string
  description?: string
  actionText?: string
}>(), {
  icon: 'empty',
  title: '暂无数据',
  description: '',
  actionText: ''
})

const emit = defineEmits<{
  action: []
}>()

// 使用内置的空状态图标
const iconSrc = computed(() => {
  return EMPTY_ICONS[props.icon] || EMPTY_ICONS.empty
})
</script>

<style lang="scss">
@import '../styles/variables.scss';

.s-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: $space-8 $space-4;
  text-align: center;

  &__icon {
    width: 160px;
    height: 160px;
    margin-bottom: $space-4;
    opacity: 0.6;
  }

  &__image {
    width: 100%;
    height: 100%;
  }

  &__title {
    font-size: $text-lg;
    font-weight: $font-medium;
    color: $color-text-2;
    margin-bottom: $space-2;
  }

  &__desc {
    font-size: $text-sm;
    color: $muted-foreground;
  }

  &__action {
    margin-top: $space-4;
    padding: 20rpx 48rpx;
    background-color: $primary;
    border-radius: 40rpx;

    &:active {
      opacity: 0.8;
    }
  }

  &__action-text {
    font-size: $text-base;
    font-weight: $font-medium;
    color: white;
  }
}
</style>
