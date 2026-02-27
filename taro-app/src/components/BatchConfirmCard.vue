<template>
  <view class="batch-confirm">
    <view class="batch-confirm__header">
      <text class="batch-confirm__title">识别结果</text>
      <text class="batch-confirm__subtitle">共 {{ successItems.length }} 条记录</text>
    </view>

    <!-- 识别结果列表 -->
    <scroll-view 
      class="batch-confirm__list" 
      :scroll-y="!isSwiping"
      :enhanced="true"
      :show-scrollbar="true"
    >
      <view class="batch-confirm__list-inner">
        <SwipeCell 
          v-for="(item, index) in items" 
          :key="index"
          @delete="handleRemove(index)"
          @swipe-start="isSwiping = true"
          @swipe-end="isSwiping = false"
        >
          <view
            class="batch-confirm__item"
            :class="{ 'batch-confirm__item--error': item.status === 'error' }"
          >
            <!-- 缩略图 -->
            <image 
              class="batch-confirm__thumb" 
              :src="item.filePath" 
              mode="aspectFill"
              @tap="previewImage(item.filePath)"
            />
            
            <!-- 内容 -->
            <view class="batch-confirm__content">
              <view v-if="item.status === 'done' && item.result" class="batch-confirm__info">
                <SBadge :customColor="getTypeConfig(item.result.type)?.color || '#78716C'" size="sm">
                  {{ getTypeConfig(item.result.type)?.label || '记录' }}
                </SBadge>
                <input
                  class="batch-confirm__input"
                  :value="item.result.title"
                  placeholder="标题"
                  @input="e => handleTitleChange(index, e)"
                />
                <picker mode="date" :value="item.result.eventDate" @change="e => handleDateChange(index, e)">
                  <view class="batch-confirm__date">
                    <image src="/static/icons/calendar.svg" class="batch-confirm__date-icon" mode="aspectFit" />
                    <text class="batch-confirm__date-text">{{ item.result.eventDate || '选择日期' }}</text>
                  </view>
                </picker>
              </view>
              <view v-else-if="item.status === 'error'" class="batch-confirm__error">
                <image src="/static/icons/alert-triangle.svg" class="batch-confirm__error-icon" mode="aspectFit" />
                <text class="batch-confirm__error-text">{{ item.error || '识别失败' }}</text>
              </view>
              <view v-else class="batch-confirm__loading">
                <view class="batch-confirm__spinner" />
                <text class="batch-confirm__loading-text">识别中...</text>
              </view>
            </view>
          </view>
        </SwipeCell>
      </view>
    </scroll-view>

    <!-- 操作按钮 - 固定在底部 -->
    <view class="batch-confirm__actions">
      <SButton variant="ghost" size="md" :block="true" @tap="$emit('cancel')">
        放弃
      </SButton>
      <SButton 
        variant="primary" 
        size="md" 
        :block="true" 
        :disabled="successItems.length === 0"
        @tap="handleConfirmAll"
      >
        保存 {{ successItems.length }} 条记录
      </SButton>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import Taro from '@tarojs/taro'
import type { BatchRecognizeItem } from '@/composables/useAiRecognize'
import { RECORD_TYPE_MAP } from '@/types/index'
import SBadge from './SBadge.vue'
import SButton from './SButton.vue'
import SwipeCell from './SwipeCell.vue'

const props = defineProps<{
  items: BatchRecognizeItem[]
}>()

const emit = defineEmits<{
  confirm: [data: Array<{ title: string; content: string; eventDate: string; type: string; imageUrl: string }>]
  cancel: []
  remove: [index: number]
  update: [index: number, data: { title?: string; eventDate?: string }]
}>()

const successItems = computed(() => 
  props.items.filter(item => item.status === 'done' && item.result)
)

const isSwiping = ref(false)

function getTypeConfig(type: string) {
  return RECORD_TYPE_MAP[type] || { label: '记录', color: '#78716C' }
}

function getTodayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function handleTitleChange(index: number, e: any) {
  emit('update', index, { title: e.detail.value })
}

function handleDateChange(index: number, e: any) {
  emit('update', index, { eventDate: e.detail.value })
}

function handleRemove(index: number) {
  emit('remove', index)
}

function previewImage(filePath: string) {
  Taro.previewImage({
    current: filePath,
    urls: [filePath]
  })
}

function handleConfirmAll() {
  const results = successItems.value.map(item => ({
    title: item.result!.title,
    content: item.result!.content,
    eventDate: item.result!.eventDate || getTodayStr(),
    type: item.result!.type,
    imageUrl: item.filePath
  }))
  emit('confirm', results)
}
</script>

<style lang="scss">
.batch-confirm {
  display: flex;
  flex-direction: column;
  height: 100%;

  &__header {
    display: flex;
    align-items: baseline;
    gap: 16rpx;
    margin-bottom: 24rpx;
    flex-shrink: 0;
  }

  &__title {
    font-size: 36rpx;
    font-weight: 600;
    color: #1C1917;
  }

  &__subtitle {
    font-size: 28rpx;
    color: #78716C;
  }

  &__list {
    flex: 1;
    height: 0;
    box-sizing: border-box;
  }

  &__list-inner {
    padding: 4rpx;
  }

  .swipe-cell {
    margin-bottom: 16rpx;
    border-radius: 28rpx;

    .swipe-cell__delete {
      border-radius: 0 28rpx 28rpx 0;
    }
  }

  &__item {
    display: flex;
    align-items: flex-start;
    gap: 20rpx;
    padding: 20rpx;
    background-color: #FAFAF9;
    border-radius: 28rpx;

    &--error {
      background-color: #FEF2F2;
    }
  }

  &__thumb {
    width: 100rpx;
    height: 100rpx;
    border-radius: 20rpx;
    flex-shrink: 0;
    object-fit: cover;
  }

  &__content {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 12rpx;
  }

  &__info {
    display: flex;
    flex-direction: column;
    gap: 12rpx;
  }

  &__input {
    height: 64rpx;
    padding: 0 20rpx;
    font-size: 28rpx;
    color: #1C1917;
    background-color: #FFFFFF;
    border: 2rpx solid #E7E5E4;
    border-radius: 20rpx;
    box-sizing: border-box;
  }

  &__date {
    display: flex;
    align-items: center;
    gap: 8rpx;
  }

  &__date-icon {
    width: 28rpx;
    height: 28rpx;
    opacity: 0.6;
  }

  &__date-text {
    font-size: 26rpx;
    color: #78716C;
  }

  &__error {
    display: flex;
    align-items: center;
    gap: 12rpx;
    padding: 16rpx 0;
  }

  &__error-icon {
    width: 32rpx;
    height: 32rpx;
  }

  &__error-text {
    font-size: 26rpx;
    color: #DC2626;
  }

  &__loading {
    display: flex;
    align-items: center;
    gap: 12rpx;
    padding: 16rpx 0;
  }

  &__spinner {
    width: 32rpx;
    height: 32rpx;
    border: 4rpx solid #E7E5E4;
    border-top-color: #1C1917;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  &__loading-text {
    font-size: 26rpx;
    color: #78716C;
  }

  &__actions {
    display: flex;
    gap: 24rpx;
    padding-top: 24rpx;
    border-top: 2rpx solid #F5F5F4;
    flex-shrink: 0;
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
