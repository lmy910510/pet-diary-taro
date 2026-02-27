<template>
  <view class="record-card" @tap="$emit('tap')">
    <view class="record-card__body">
      <view class="record-card__header">
        <view class="record-card__type-icon">
          <RecordTypeIcon :type="record.type" :size="104" />
        </view>
        <view class="record-card__info">
          <text class="record-card__title">{{ record.title }}</text>
          <text class="record-card__time">{{ record.eventDate }}</text>
        </view>
        <SBadge variant="secondary" :customColor="typeConfig.color">{{ typeConfig.label }}</SBadge>
      </view>
      <text v-if="record.content" class="record-card__content">{{ record.content }}</text>
      <view v-if="record.imageUrl && !imageError" class="record-card__thumb-row">
        <image :src="record.imageUrl" class="record-card__thumb" mode="aspectFill" @error="imageError = true" />
        <text class="record-card__thumb-label">查看原图 ›</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { PetRecord } from '@/types/index'
import { RECORD_TYPE_MAP } from '@/types/index'
import SBadge from './SBadge.vue'
import RecordTypeIcon from './icons/RecordTypeIcon.vue'

const props = defineProps<{
  record: PetRecord
}>()

defineEmits<{
  tap: []
}>()

const imageError = ref(false)
const typeConfig = computed(() => RECORD_TYPE_MAP[props.record.type])
</script>

<style lang="scss">
.record-card {
  display: flex;
  flex-direction: row;
  background-color: #FFFFFF;
  border: 3rpx solid #E7E5E4;
  border-radius: 36rpx;
  overflow: hidden;
  box-shadow:
    0 2rpx 8rpx rgba(0, 0, 0, 0.02),
    0 1rpx 3rpx rgba(0, 0, 0, 0.03);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &:active {
    transform: scale(0.99);
    box-shadow: 0 1rpx 4rpx rgba(0, 0, 0, 0.03);
  }

  &__body {
    flex: 1;
    padding: 36rpx;
    display: flex;
    flex-direction: column;
    gap: 20rpx;
  }

  &__header {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 28rpx;
  }

  &__type-icon {
    width: 104rpx;
    height: 104rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  &__info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6rpx;
    min-width: 0;
  }

  &__title {
    font-size: 32rpx;
    font-weight: 600;
    color: #1C1917;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__time {
    font-size: 26rpx;
    color: #A8A29E;
  }

  &__content {
    font-size: 28rpx;
    color: #78716C;
    line-height: 1.5;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    padding-left: 132rpx;
  }

  &__thumb-row {
    display: flex;
    align-items: center;
    gap: 16rpx;
    padding-left: 132rpx;
    margin-top: 8rpx;
  }

  /* 嵌套圆角：卡片 36rpx - padding 24rpx = 12rpx */
  &__thumb {
    width: 88rpx;
    height: 88rpx;
    border-radius: 12rpx;
    border: 2rpx solid #E7E5E4;
  }

  &__thumb-label {
    font-size: 24rpx;
    color: #78716C;
    font-weight: 500;
  }
}
</style>
