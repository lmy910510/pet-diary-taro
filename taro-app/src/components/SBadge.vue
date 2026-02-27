<template>
  <view
    :class="['s-badge', `s-badge--${variant}`]"
    :style="customColor ? `background-color:${customColor};color:#fff;border-color:${customColor};` : ''"
  >
    <slot />
  </view>
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

<style lang="scss">
.s-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 48rpx;
  padding: 0 20rpx;
  font-size: 22rpx;
  font-weight: 600;
  line-height: 1;
  border-radius: 12rpx;
  white-space: nowrap;
  border: 2rpx solid transparent;
  letter-spacing: 0.5rpx;

  &--default {
    background-color: #1C1917;
    color: #FFFFFF;
  }
  &--secondary {
    background-color: #F5F5F4;
    color: #78716C;
    border-color: #E7E5E4;
  }
  &--outline {
    background-color: transparent;
    border-color: #E7E5E4;
    color: #1C1917;
  }
}
</style>
