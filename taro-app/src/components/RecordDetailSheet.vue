<template>
  <view v-if="visible" class="detail-mask" @tap.self="handleClose">
    <!-- 背景蒙层 - 阻止穿透 -->
    <view class="detail-mask__bg" catchMove @tap="handleClose" />
    <view :class="['detail-sheet', show ? 'detail-sheet--visible' : '']">
      <view class="detail-sheet__handle">
        <view class="detail-sheet__bar" />
      </view>

      <scroll-view 
        :scroll-y="true"
        class="detail-sheet__scroll"
        style="height: calc(85vh - 52px - 120rpx - env(safe-area-inset-bottom));"
      >
        <view class="detail-sheet__scroll-inner">
        <!-- 查看模式 -->
        <template v-if="!editing">
          <view class="detail-sheet__header">
            <SBadge :customColor="typeConfig.color">{{ typeConfig.label }}</SBadge>
            <text class="detail-sheet__title">{{ record.title }}</text>
          </view>

          <!-- 原图区域 -->
          <view v-if="record.imageUrl && !imageError" class="detail-sheet__image-section">
            <text class="detail-sheet__section-label">原始图片</text>
            <view class="detail-sheet__image-wrapper" @tap="previewImage">
              <image :src="record.imageUrl" class="detail-sheet__image" mode="aspectFill" @error="imageError = true" />
              <text class="detail-sheet__image-hint">点击查看大图</text>
            </view>
          </view>

          <!-- 详细信息 -->
          <view class="detail-sheet__info">
            <view class="detail-sheet__info-row">
              <text class="detail-sheet__info-label">日期</text>
              <text class="detail-sheet__info-value">{{ record.eventDate }}</text>
            </view>
            <view class="detail-sheet__info-row">
              <text class="detail-sheet__info-label">状态</text>
              <text class="detail-sheet__info-value">{{ record.status === 'confirmed' ? '已确认' : '待确认' }}</text>
            </view>
            <view class="detail-sheet__info-row">
              <text class="detail-sheet__info-label">创建时间</text>
              <text class="detail-sheet__info-value">{{ formatCreatedAt(record.createdAt) }}</text>
            </view>
          </view>

          <!-- 内容 -->
          <view v-if="record.content" class="detail-sheet__content-section">
            <text class="detail-sheet__section-label">详细内容</text>
            <!-- 体重记录结构化展示 -->
            <view v-if="isWeightRecord" class="detail-sheet__weight-detail">
              <view class="detail-sheet__weight-main">
                <image class="detail-sheet__weight-icon" src="/static/icons/paw-print.svg" mode="aspectFit" />
                <text class="detail-sheet__weight-value">{{ weightData.petWeight }} kg</text>
                <text class="detail-sheet__weight-sub">宠物体重</text>
              </view>
              <view v-if="weightData.totalWeight" class="detail-sheet__weight-breakdown">
                <view class="detail-sheet__weight-item">
                  <text class="detail-sheet__weight-item-label">抱宠称重</text>
                  <text class="detail-sheet__weight-item-value">{{ weightData.totalWeight }} kg</text>
                </view>
                <view class="detail-sheet__weight-item">
                  <text class="detail-sheet__weight-item-label">人体体重</text>
                  <text class="detail-sheet__weight-item-value">{{ weightData.humanWeight }} kg</text>
                </view>
              </view>
            </view>
            <!-- 普通记录文本展示 -->
            <view v-else class="detail-sheet__content-box">
              <text class="detail-sheet__content-text">{{ record.content }}</text>
            </view>
          </view>
        </template>

        <!-- 编辑模式 -->
        <template v-else>
          <view class="detail-sheet__header">
            <text class="detail-sheet__title">编辑记录</text>
          </view>

          <view class="detail-sheet__edit-form">
            <view class="detail-sheet__edit-field">
              <text class="detail-sheet__edit-label">类型</text>
              <view class="detail-sheet__type-chips">
                <view
                  v-for="tc in editableTypes"
                  :key="tc.type"
                  :class="['detail-sheet__type-chip', editForm.type === tc.type ? 'detail-sheet__type-chip--active' : '']"
                  :style="editForm.type === tc.type ? `background-color:${tc.color};color:#fff;border-color:${tc.color}` : ''"
                  @tap="editForm.type = tc.type"
                >{{ tc.label }}</view>
              </view>
            </view>

            <view class="detail-sheet__edit-field">
              <text class="detail-sheet__edit-label">标题</text>
              <SInput :value="editForm.title" placeholder="记录标题" @input="editForm.title = $event" />
            </view>

            <view class="detail-sheet__edit-field">
              <text class="detail-sheet__edit-label">日期</text>
              <picker mode="date" :value="editForm.eventDate" @change="e => editForm.eventDate = e.detail.value">
                <view class="detail-sheet__date-picker">
                  <text class="detail-sheet__date-text">{{ editForm.eventDate }}</text>
                </view>
              </picker>
            </view>

            <view class="detail-sheet__edit-field">
              <text class="detail-sheet__edit-label">详细内容</text>
              <SInput :value="editForm.content" placeholder="补充说明（可选）" :textarea="true" @input="editForm.content = $event" />
            </view>
          </view>
        </template>
        </view>
      </scroll-view>

      <!-- 操作按钮 - 固定在底部 -->
      <view class="detail-sheet__footer">
        <template v-if="!editing">
          <view class="detail-sheet__actions-row">
            <SButton variant="outline" size="md" :block="true" @tap="showDeleteConfirm = true" class="detail-sheet__delete-btn">删除记录</SButton>
            <SButton variant="outline" size="md" :block="true" @tap="enterEditMode">编辑</SButton>
          </view>
        </template>
        <template v-else>
          <view class="detail-sheet__actions-row">
            <SButton variant="outline" size="md" :block="true" @tap="cancelEdit">取消</SButton>
            <SButton variant="primary" size="md" :block="true" :loading="saving" @tap="handleSave">保存修改</SButton>
          </view>
        </template>
      </view>

      <!-- 删除确认弹窗 -->
      <view v-if="showDeleteConfirm" class="delete-confirm-overlay" @tap.self="showDeleteConfirm = false">
        <view class="delete-confirm">
          <image class="delete-confirm__icon" src="/static/icons/alert-triangle.svg" mode="aspectFit" />
          <text class="delete-confirm__title">确认删除</text>
          <text class="delete-confirm__desc">删除后无法恢复，确定要删除这条记录吗？</text>
          <view class="delete-confirm__actions">
            <SButton variant="outline" size="md" :block="true" @tap="showDeleteConfirm = false">取消</SButton>
            <SButton variant="default" size="md" :block="true" :loading="deleting" @tap="handleDelete" class="delete-confirm__danger-btn">确认删除</SButton>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue'
import Taro from '@tarojs/taro'
import type { PetRecord, RecordType } from '@/types/index'
import { RECORD_TYPE_MAP } from '@/types/index'
import SBadge from './SBadge.vue'
import SButton from './SButton.vue'
import SInput from './SInput.vue'

const props = defineProps<{
  visible: boolean
  record: PetRecord
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'delete': [record: PetRecord]
  'edit': [record: PetRecord, data: Partial<PetRecord>]
}>()

const showDeleteConfirm = ref(false)
const deleting = ref(false)
const editing = ref(false)
const saving = ref(false)
const show = ref(false)
const imageError = ref(false)

const editForm = reactive({
  title: '',
  content: '',
  eventDate: '',
  type: '' as RecordType
})

const editableTypes = computed(() => [
  { ...RECORD_TYPE_MAP.medical, type: 'medical' as RecordType },
  { ...RECORD_TYPE_MAP.diet, type: 'diet' as RecordType },
  { ...RECORD_TYPE_MAP.growth, type: 'growth' as RecordType },
  { ...RECORD_TYPE_MAP.grooming, type: 'grooming' as RecordType }
])

const typeConfig = computed(() => RECORD_TYPE_MAP[props.record.type])

const isWeightRecord = computed(() => {
  return props.record.type === 'growth' && props.record.aiRawData?.petWeight != null
})

const weightData = computed(() => {
  const raw = props.record.aiRawData || {}
  return {
    petWeight: raw.petWeight ?? 0,
    totalWeight: raw.totalWeight ?? 0,
    humanWeight: raw.humanWeight ?? 0
  }
})

watch(
  () => props.visible,
  (val) => {
    if (val) {
      editing.value = false
      setTimeout(() => { show.value = true }, 50)
    } else {
      show.value = false
      editing.value = false
    }
  },
  { immediate: true }
)

function enterEditMode() {
  editForm.title = props.record.title
  editForm.content = props.record.content
  editForm.eventDate = props.record.eventDate
  editForm.type = props.record.type
  editing.value = true
}

function cancelEdit() {
  editing.value = false
}

function handleSave() {
  if (!editForm.title.trim()) return

  saving.value = true
  const updateData: Partial<PetRecord> = {}

  if (editForm.title !== props.record.title) updateData.title = editForm.title
  if (editForm.content !== props.record.content) updateData.content = editForm.content
  if (editForm.eventDate !== props.record.eventDate) updateData.eventDate = editForm.eventDate
  if (editForm.type !== props.record.type) updateData.type = editForm.type

  if (Object.keys(updateData).length > 0) {
    emit('edit', props.record, updateData)
  }

  saving.value = false
  editing.value = false
}

function handleClose() {
  show.value = false
  showDeleteConfirm.value = false
  editing.value = false
  setTimeout(() => {
    emit('update:visible', false)
  }, 300)
}

function handleDelete() {
  deleting.value = true
  emit('delete', props.record)
}

function previewImage() {
  if (props.record.imageUrl) {
    Taro.previewImage({
      current: props.record.imageUrl,
      urls: [props.record.imageUrl]
    })
  }
}

function formatCreatedAt(ts: number): string {
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}`
}
</script>

<style lang="scss">
.detail-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10000;
  display: flex;
  align-items: flex-end;
  justify-content: center;

  &__bg {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
  }
}

.detail-sheet {
  width: 100%;
  max-width: 100vw;
  height: 85vh;
  background-color: #FFFFFF;
  border-radius: 48rpx 48rpx 0 0;
  transform: translateY(100%);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
  position: relative;
  z-index: 1;

  &--visible {
    transform: translateY(0);
  }

  &__handle {
    display: flex;
    justify-content: center;
    padding: 28rpx 0 16rpx;
    flex-shrink: 0;
  }

  &__bar {
    width: 80rpx;
    height: 8rpx;
    border-radius: 9999px;
    background-color: #E7E5E4;
  }

  &__scroll {
    box-sizing: border-box;
  }

  &__scroll-inner {
    padding: 0 40rpx 40rpx;
  }

  &__footer {
    flex-shrink: 0;
    padding: 24rpx 40rpx;
    padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
    background-color: #FFFFFF;
    border-top: 2rpx solid #F5F5F4;
  }

  &__header {
    display: flex;
    align-items: center;
    gap: 24rpx;
    margin-bottom: 48rpx;
  }

  &__title {
    font-size: 40rpx;
    font-weight: 700;
    color: #1C1917;
    letter-spacing: -0.5rpx;
  }

  &__section-label {
    font-size: 28rpx;
    font-weight: 600;
    color: #A8A29E;
    margin-bottom: 20rpx;
    display: block;
    letter-spacing: 0.5rpx;
  }

  &__image-section {
    display: flex;
    flex-direction: column;
    margin-bottom: 48rpx;
  }

  &__image-wrapper {
    position: relative;
    border: 2rpx solid #E7E5E4;
    border-radius: 28rpx;
    overflow: hidden;
  }

  &__image {
    width: 100%;
    height: 400rpx;
  }

  &__image-hint {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 24rpx 0;
    text-align: center;
    font-size: 24rpx;
    color: #FFFFFF;
    background: linear-gradient(transparent, rgba(0, 0, 0, 0.5));
  }

  &__info {
    display: flex;
    flex-direction: column;
    gap: 32rpx;
    background-color: #F5F5F4;
    border-radius: 28rpx;
    padding: 40rpx 40rpx;
    width: 100%;
    box-sizing: border-box;
    margin-bottom: 48rpx;
  }

  &__info-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 24rpx;
    width: 100%;
  }

  &__info-label {
    font-size: 28rpx;
    color: #A8A29E;
    flex-shrink: 0;
    white-space: nowrap;
  }

  &__info-value {
    font-size: 28rpx;
    font-weight: 600;
    color: #1C1917;
    text-align: right;
    flex: 1;
    min-width: 0;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }

  &__content-section {
    display: flex;
    flex-direction: column;
    margin-bottom: 48rpx;
  }

  &__content-box {
    background-color: #F5F5F4;
    border-radius: 28rpx;
    padding: 40rpx 40rpx;
  }

  &__content-text {
    font-size: 32rpx;
    color: #1C1917;
    line-height: 1.7;
  }

  &__weight-detail {
    display: flex;
    flex-direction: column;
    gap: 24rpx;
  }

  &__weight-main {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12rpx;
    background: linear-gradient(135deg, #FCE4EC 0%, #F3E5F5 100%);
    border-radius: 28rpx;
    padding: 48rpx 32rpx;
  }

  &__weight-icon {
    width: 56rpx;
    height: 56rpx;
  }

  &__weight-value {
    font-size: 72rpx;
    font-weight: 700;
    color: #E91E63;
  }

  &__weight-sub {
    font-size: 28rpx;
    color: #78716C;
  }

  &__weight-breakdown {
    display: flex;
    gap: 24rpx;
  }

  &__weight-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12rpx;
    background-color: #F5F5F4;
    border-radius: 24rpx;
    padding: 32rpx;
  }

  &__weight-item-label {
    font-size: 28rpx;
    color: #A8A29E;
  }

  &__weight-item-value {
    font-size: 36rpx;
    font-weight: 700;
    color: #1C1917;
  }

  &__actions-row {
    display: flex;
    gap: 20rpx;
  }

  &__delete-btn {
    color: #EF4444 !important;
    border-color: #FCA5A5 !important;
  }

  &__edit-form {
    display: flex;
    flex-direction: column;
    gap: 40rpx;
    margin-bottom: 48rpx;
  }

  &__edit-field {
    display: flex;
    flex-direction: column;
    gap: 16rpx;
  }

  &__edit-label {
    font-size: 28rpx;
    font-weight: 600;
    color: #1C1917;
  }

  &__type-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 16rpx;
  }

  &__type-chip {
    height: 72rpx;
    padding: 0 32rpx;
    border-radius: 20rpx;
    border: 2rpx solid #E7E5E4;
    background-color: #FFFFFF;
    color: #1C1917;
    font-size: 28rpx;
    font-weight: 500;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;

    &--active {
      border-color: transparent;
    }
  }

  &__date-picker {
    display: flex;
    align-items: center;
    height: 96rpx;
    padding: 0 32rpx;
    border: 2rpx solid #E7E5E4;
    border-radius: 24rpx;
    background-color: #FFFFFF;
  }

  &__date-text {
    font-size: 32rpx;
    color: #1C1917;
  }
}

.delete-confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 10100;
  display: flex;
  align-items: center;
  justify-content: center;
}

.delete-confirm {
  width: 600rpx;
  background-color: #FFFFFF;
  border-radius: 40rpx;
  padding: 48rpx 24rpx 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;

  &__icon {
    width: 80rpx;
    height: 80rpx;
  }

  &__title {
    font-size: 38rpx;
    font-weight: 700;
    color: #1C1917;
  }

  &__desc {
    font-size: 28rpx;
    color: #78716C;
    text-align: center;
    line-height: 1.6;
    padding: 0 24rpx;
  }

  &__actions {
    display: flex;
    gap: 16rpx;
    width: 100%;
    margin-top: 12rpx;
  }

  &__actions .s-btn {
    border-radius: 16rpx !important;
  }

  &__danger-btn {
    background-color: #EF4444 !important;
    color: #FFFFFF !important;
    border-color: #EF4444 !important;
  }
}
</style>
