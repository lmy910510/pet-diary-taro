<template>
  <view class="confirm-card">
    <view class="confirm-card__header">
      <SBadge :customColor="typeConfig?.color || '#78716C'">{{ typeConfig?.label || '记录' }}</SBadge>
      <text class="confirm-card__hint">AI 识别结果</text>
    </view>

    <!-- 原图预览 -->
    <view v-if="imageUrl" class="confirm-card__image-preview" @tap="previewImage">
      <image :src="imageUrl" class="confirm-card__image" mode="aspectFill" />
      <view class="confirm-card__image-tag">
        <text class="confirm-card__image-tag-text">识别原图</text>
      </view>
    </view>

    <view class="confirm-card__fields">
      <view class="confirm-card__field">
        <text class="confirm-card__label">标题</text>
        <view class="confirm-card__input-wrap">
          <input
            class="confirm-card__input"
            :value="editData.title"
            placeholder="事件标题"
            @input="e => editData.title = e.detail.value"
          />
        </view>
      </view>
      <view class="confirm-card__field">
        <text class="confirm-card__label">时间</text>
        <picker mode="date" :value="editData.eventDate" @change="onDateChange">
          <view class="confirm-card__date-picker">
            <text class="confirm-card__date-text">{{ dateDisplayText }}</text>
            <text v-if="isDefaultDate" class="confirm-card__date-hint">点击修改</text>
          </view>
        </picker>
      </view>
      <view class="confirm-card__field">
        <text class="confirm-card__label">备注</text>
        <view class="confirm-card__input-wrap">
          <textarea
            class="confirm-card__textarea"
            :value="editData.content"
            placeholder="补充说明（可选）"
            auto-height
            @input="e => editData.content = e.detail.value"
          />
        </view>
      </view>
    </view>

    <view class="confirm-card__actions">
      <SButton variant="outline" size="md" :block="true" @tap="$emit('cancel')">
        放弃
      </SButton>
      <SButton variant="primary" size="md" :block="true" @tap="handleConfirm">
        确认保存
      </SButton>
    </view>
  </view>
</template>

<script setup lang="ts">
import { reactive, watch, computed, ref } from 'vue'
import Taro from '@tarojs/taro'
import type { RecognizeResult } from '@/types/index'
import { RECORD_TYPE_MAP } from '@/types/index'
import SBadge from './SBadge.vue'
import SButton from './SButton.vue'

const props = defineProps<{
  result: RecognizeResult
  imageUrl?: string
}>()

const emit = defineEmits<{
  confirm: [data: { title: string; content: string; eventDate: string; type: string }]
  cancel: []
}>()

const editData = reactive({
  title: '',
  content: '',
  eventDate: ''
})

/** 记录是否使用了默认日期（今天） */
const isDefaultDate = ref(false)
/** 记录用户是否手动修改过日期 */
const hasUserChangedDate = ref(false)

/** 获取今天的日期字符串 YYYY-MM-DD */
function getTodayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 日期显示文本（今天的日期会加上「今天」标识） */
const dateDisplayText = computed(() => {
  if (!editData.eventDate) return '请选择日期'
  const today = getTodayStr()
  if (editData.eventDate === today) {
    return `${editData.eventDate}（今天）`
  }
  return editData.eventDate
})

watch(
  () => props.result,
  (val) => {
    console.log('[ConfirmCard] result changed:', val)
    if (val) {
      editData.title = val.title || ''
      editData.content = val.content || ''
      // 如果 AI 无法识别日期（返回空字符串），则默认填入今天的日期
      const today = getTodayStr()
      if (val.eventDate) {
        editData.eventDate = val.eventDate
        // 如果 AI 返回的日期就是今天，也标记为默认日期
        isDefaultDate.value = val.eventDate === today
      } else {
        editData.eventDate = today
        isDefaultDate.value = true
      }
      hasUserChangedDate.value = false
      console.log('[ConfirmCard] editData set:', { ...editData }, 'isDefaultDate:', isDefaultDate.value)
    }
  },
  { immediate: true, deep: true }
)

const typeConfig = computed(() => {
  if (!props.result?.type) return { label: '记录', color: '#78716C' }
  return RECORD_TYPE_MAP[props.result.type] || { label: '记录', color: '#78716C' }
})

function onDateChange(e: any) {
  editData.eventDate = e.detail.value
  hasUserChangedDate.value = true
  // 用户修改后，不再显示「点击修改」提示
  isDefaultDate.value = false
}

function handleConfirm() {
  emit('confirm', {
    title: editData.title,
    content: editData.content,
    eventDate: editData.eventDate,
    type: props.result?.type || 'medical'
  })
}

function previewImage() {
  if (props.imageUrl) {
    Taro.previewImage({
      current: props.imageUrl,
      urls: [props.imageUrl]
    })
  }
}
</script>

<style lang="scss">
.confirm-card {
  display: flex;
  flex-direction: column;
  gap: 32px;

  &__header {
    display: flex;
    align-items: center;
    gap: 24px;
  }

  &__hint {
    font-size: 28px;
    color: #78716C;
  }

  &__image-preview {
    position: relative;
    border-radius: 24rpx;
    overflow: hidden;
    border: 2rpx solid #E7E5E4;
  }

  &__image {
    width: 100%;
    height: 320rpx;
    display: block;
  }

  &__image-tag {
    position: absolute;
    bottom: 16rpx;
    left: 16rpx;
    background-color: rgba(0, 0, 0, 0.5);
    border-radius: 12rpx;
    padding: 6rpx 16rpx;
  }

  &__image-tag-text {
    font-size: 22rpx;
    color: #FFFFFF;
  }

  &__fields {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__label {
    font-size: 28px;
    font-weight: 500;
    color: #1C1917;
  }

  &__input-wrap {
    display: flex;
    border: 2px solid #E7E5E4;
    border-radius: 28rpx;
    background-color: #FFFFFF;
  }

  &__input {
    flex: 1;
    height: 80px;
    padding: 0 24px;
    font-size: 28px;
    color: #1C1917;
    background: transparent;
    border: none;
  }

  &__textarea {
    flex: 1;
    min-height: 80px;
    max-height: 160px;
    padding: 20px 24px;
    font-size: 28px;
    line-height: 1.5;
    color: #1C1917;
    background: transparent;
    border: none;
  }

  &__date-picker {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 88px;
    padding: 0 24px;
    border: 2px solid #E7E5E4;
    border-radius: 28rpx;
    background-color: #FFFFFF;
  }

  &__date-text {
    font-size: 32px;
    color: #1C1917;
  }

  &__date-hint {
    font-size: 24px;
    color: #A8A29E;
  }

  &__actions {
    display: flex;
    gap: 24px;
    padding-top: 16px;
  }
}
</style>
