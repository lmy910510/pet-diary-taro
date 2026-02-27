<template>
  <view :class="['s-card', noPadding ? 's-card--no-padding' : '']" :style="customStyle">
    <view v-if="$slots.header" class="s-card__header">
      <slot name="header" />
    </view>
    <view v-if="$slots.default" class="s-card__content">
      <slot />
    </view>
    <view v-if="$slots.footer" class="s-card__footer">
      <slot name="footer" />
    </view>
  </view>
</template>

<script setup lang="ts">
defineProps<{
  noPadding?: boolean
  customStyle?: string
}>()
</script>

<style lang="scss">
@import '../styles/variables.scss';

.s-card {
  background-color: $card;
  border: 2px solid $border;
  border-radius: $radius;
  overflow: hidden;

  &__header {
    padding: $space-4 $space-4 0;
  }
  &__content {
    padding: $space-4;
  }
  &__footer {
    padding: 0 $space-4 $space-4;
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
