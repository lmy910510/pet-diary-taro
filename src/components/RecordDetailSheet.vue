<template>
  <Teleport to="body">
    <div v-if="visible" class="detail-mask" @click.self="handleClose">
      <div :class="['detail-sheet', show ? 'detail-sheet--visible' : '']">
        <div class="detail-sheet__handle">
          <div class="detail-sheet__bar" />
        </div>

        <div class="detail-sheet__body">
          <!-- ========== 查看模式 ========== -->
          <template v-if="!editing">
            <!-- 顶部类型标签 + 标题 -->
            <div class="detail-sheet__header">
              <SBadge :custom-color="typeConfig.color">{{ typeConfig.label }}</SBadge>
              <span class="detail-sheet__title">{{ record.title }}</span>
            </div>

            <!-- 原图区域 -->
            <div v-if="record.imageUrl" class="detail-sheet__image-section">
              <span class="detail-sheet__section-label">原始图片</span>
              <div class="detail-sheet__image-wrapper" @click="showFullImage = true">
                <img :src="record.imageUrl" alt="原始图片" class="detail-sheet__image" />
                <span class="detail-sheet__image-hint">点击查看大图</span>
              </div>
            </div>

            <!-- 详细信息 -->
            <div class="detail-sheet__info">
              <div class="detail-sheet__info-row">
                <span class="detail-sheet__info-label">日期</span>
                <span class="detail-sheet__info-value">{{ record.eventDate }}</span>
              </div>
              <div class="detail-sheet__info-row">
                <span class="detail-sheet__info-label">状态</span>
                <span class="detail-sheet__info-value">{{ record.status === 'confirmed' ? '已确认' : '待确认' }}</span>
              </div>
              <div class="detail-sheet__info-row">
                <span class="detail-sheet__info-label">创建时间</span>
                <span class="detail-sheet__info-value">{{ formatCreatedAt(record.createdAt) }}</span>
              </div>
            </div>

            <!-- 内容 -->
            <div v-if="record.content" class="detail-sheet__content-section">
              <span class="detail-sheet__section-label">详细内容</span>
              <!-- 体重记录结构化展示 -->
              <div v-if="isWeightRecord" class="detail-sheet__weight-detail">
                <div class="detail-sheet__weight-main">
                  <span class="detail-sheet__weight-icon">🐱</span>
                  <span class="detail-sheet__weight-value">{{ weightData.petWeight }} kg</span>
                  <span class="detail-sheet__weight-sub">宠物体重</span>
                </div>
                <div class="detail-sheet__weight-breakdown">
                  <div class="detail-sheet__weight-item">
                    <span class="detail-sheet__weight-item-label">抱宠称重</span>
                    <span class="detail-sheet__weight-item-value">{{ weightData.totalWeight }} kg</span>
                  </div>
                  <div class="detail-sheet__weight-item">
                    <span class="detail-sheet__weight-item-label">人体体重</span>
                    <span class="detail-sheet__weight-item-value">{{ weightData.humanWeight }} kg</span>
                  </div>
                </div>
              </div>
              <!-- 普通记录文本展示 -->
              <div v-else class="detail-sheet__content-box">
                <span class="detail-sheet__content-text">{{ record.content }}</span>
              </div>
            </div>

            <!-- 无图提示 -->
            <div v-if="!record.imageUrl" class="detail-sheet__no-image">
              <span class="detail-sheet__no-image-icon">📷</span>
              <span class="detail-sheet__no-image-text">该记录没有关联图片</span>
            </div>

            <!-- 操作按钮 -->
            <div class="detail-sheet__actions">
              <div class="detail-sheet__actions-row">
                <SButton variant="outline" size="md" :block="true" @tap="showDeleteConfirm = true" class="detail-sheet__delete-btn">删除记录</SButton>
                <SButton variant="outline" size="md" :block="true" @tap="enterEditMode" class="detail-sheet__edit-btn">
                  <Pencil :size="16" :stroke-width="1.5" />
                  编辑
                </SButton>
              </div>
            </div>
          </template>

          <!-- ========== 编辑模式 ========== -->
          <template v-else>
            <div class="detail-sheet__header">
              <Pencil :size="20" :stroke-width="1.5" class="detail-sheet__edit-icon" />
              <span class="detail-sheet__title">编辑记录</span>
            </div>

            <div class="detail-sheet__edit-form">
              <!-- 类型选择 -->
              <div class="detail-sheet__edit-field">
                <label class="detail-sheet__edit-label">类型</label>
                <div class="detail-sheet__type-chips">
                  <button
                    v-for="tc in editableTypes"
                    :key="tc.type"
                    :class="['detail-sheet__type-chip', editForm.type === tc.type ? 'detail-sheet__type-chip--active' : '']"
                    :style="editForm.type === tc.type ? `background-color:${tc.color};color:#fff;border-color:${tc.color}` : ''"
                    @click="editForm.type = tc.type"
                  >
                    {{ tc.label }}
                  </button>
                </div>
              </div>

              <!-- 标题 -->
              <div class="detail-sheet__edit-field">
                <label class="detail-sheet__edit-label">标题</label>
                <SInput v-model="editForm.title" placeholder="记录标题" />
              </div>

              <!-- 日期 -->
              <div class="detail-sheet__edit-field">
                <label class="detail-sheet__edit-label">日期</label>
                <div class="detail-sheet__date-picker">
                  <input
                    type="date"
                    v-model="editForm.eventDate"
                    class="detail-sheet__date-input"
                  />
                </div>
              </div>

              <!-- 内容 -->
              <div class="detail-sheet__edit-field">
                <label class="detail-sheet__edit-label">详细内容</label>
                <SInput v-model="editForm.content" placeholder="补充说明（可选）" :textarea="true" />
              </div>
            </div>

            <!-- 编辑操作按钮 -->
            <div class="detail-sheet__actions">
              <div class="detail-sheet__actions-row">
                <SButton variant="outline" size="md" :block="true" @tap="cancelEdit">取消</SButton>
                <SButton variant="primary" size="md" :block="true" :loading="saving" @tap="handleSave">保存修改</SButton>
              </div>
            </div>
          </template>

          <!-- 删除确认弹窗 -->
          <div v-if="showDeleteConfirm" class="delete-confirm-overlay" @click.self="showDeleteConfirm = false">
            <div class="delete-confirm">
              <span class="delete-confirm__icon">⚠️</span>
              <span class="delete-confirm__title">确认删除</span>
              <span class="delete-confirm__desc">删除后无法恢复，确定要删除这条记录吗？</span>
              <div class="delete-confirm__actions">
                <SButton variant="outline" size="md" :block="true" @tap="showDeleteConfirm = false">取消</SButton>
                <SButton variant="default" size="md" :block="true" :loading="deleting" @tap="handleDelete" class="delete-confirm__danger-btn">确认删除</SButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 全屏查看大图 -->
    <div v-if="showFullImage && record.imageUrl" class="fullscreen-mask" @click="showFullImage = false">
      <img :src="record.imageUrl" alt="原始图片" class="fullscreen-image" />
      <span class="fullscreen-hint">点击任意处关闭</span>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, reactive, watch, nextTick, computed } from 'vue'
import type { PetRecord, RecordType } from '@/types/index'
import { RECORD_TYPE_MAP } from '@/types/index'
import { Pencil } from 'lucide-vue-next'
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
const showFullImage = ref(false)

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
  async (val) => {
    if (val) {
      showFullImage.value = false
      editing.value = false
      await nextTick()
      setTimeout(() => { show.value = true }, 50)
    } else {
      show.value = false
      editing.value = false
    }
  }
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

async function handleSave() {
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
  showFullImage.value = false
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

<style lang="scss" scoped>
.detail-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  animation: fadeIn 0.2s ease;
}

.detail-sheet {
  width: 100%;
  max-width: 430px;
  max-height: 90vh;
  background-color: var(--card);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  transform: translateY(100%);
  transition: transform var(--transition-slow);
  display: flex;
  flex-direction: column;

  &--visible {
    transform: translateY(0);
  }

  &__handle {
    display: flex;
    justify-content: center;
    padding: var(--space-3) 0;
    flex-shrink: 0;
  }

  &__bar {
    width: 40px;
    height: 4px;
    border-radius: var(--radius-full);
    background-color: var(--muted);
  }

  &__body {
    padding: 0 var(--space-5) var(--space-5);
    padding-bottom: calc(var(--space-5) + env(safe-area-inset-bottom));
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  &__header {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  &__title {
    font-size: var(--text-lg);
    font-weight: var(--font-semibold);
    color: var(--foreground);
  }

  &__section-label {
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    color: var(--muted-foreground);
    margin-bottom: var(--space-2);
    display: block;
  }

  &__image-section {
    display: flex;
    flex-direction: column;
  }

  &__image-wrapper {
    position: relative;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
    cursor: pointer;
    transition: opacity var(--transition-fast);

    &:hover {
      opacity: 0.9;
    }
  }

  &__image {
    width: 100%;
    max-height: 280px;
    object-fit: cover;
    display: block;
  }

  &__image-hint {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: var(--space-2) 0;
    text-align: center;
    font-size: var(--text-xs);
    color: #fff;
    background: linear-gradient(transparent, rgba(0, 0, 0, 0.5));
  }

  &__info {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    background-color: var(--muted);
    border-radius: var(--radius);
    padding: var(--space-3) var(--space-4);
  }

  &__info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  &__info-label {
    font-size: var(--text-sm);
    color: var(--muted-foreground);
  }

  &__info-value {
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    color: var(--foreground);
  }

  &__content-section {
    display: flex;
    flex-direction: column;
  }

  &__content-box {
    background-color: var(--muted);
    border-radius: var(--radius);
    padding: var(--space-3) var(--space-4);
  }

  &__content-text {
    font-size: var(--text-base);
    color: var(--foreground);
    line-height: var(--leading-relaxed);
    white-space: pre-wrap;
    word-break: break-word;
  }

  &__weight-detail {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  &__weight-main {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-1);
    background: linear-gradient(135deg, #FCE4EC 0%, #F3E5F5 100%);
    border-radius: var(--radius);
    padding: var(--space-4);
  }

  &__weight-icon {
    font-size: 28px;
  }

  &__weight-value {
    font-size: 32px;
    font-weight: var(--font-bold);
    color: #E91E63;
  }

  &__weight-sub {
    font-size: var(--text-sm);
    color: var(--muted-foreground);
  }

  &__weight-breakdown {
    display: flex;
    gap: var(--space-3);
  }

  &__weight-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-1);
    background-color: var(--muted);
    border-radius: var(--radius);
    padding: var(--space-3);
  }

  &__weight-item-label {
    font-size: var(--text-sm);
    color: var(--muted-foreground);
  }

  &__weight-item-value {
    font-size: var(--text-base);
    font-weight: var(--font-semibold);
    color: var(--foreground);
  }

  &__no-image {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-5) 0;
    color: var(--muted-foreground);
  }

  &__no-image-icon {
    font-size: 32px;
    opacity: 0.4;
  }

  &__no-image-text {
    font-size: var(--text-sm);
  }

  &__actions {
    padding-top: var(--space-2);
  }

  &__actions-row {
    display: flex;
    gap: var(--space-3);
  }

  &__delete-btn {
    color: #EF4444 !important;
    border-color: #FCA5A5 !important;

    &:hover {
      background-color: #FEF2F2 !important;
    }
  }

  &__edit-btn {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  &__edit-icon {
    color: var(--muted-foreground);
  }

  &__edit-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  &__edit-field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  &__edit-label {
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    color: var(--foreground);
  }

  &__type-chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  &__type-chip {
    height: 32px;
    padding: 0 var(--space-3);
    border-radius: var(--radius);
    border: 1px solid var(--border);
    background-color: var(--card);
    color: var(--foreground);
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    font-family: var(--font-family);
    cursor: pointer;
    transition: all 0.15s ease;

    &:active {
      transform: scale(0.96);
    }

    &--active {
      border-color: transparent;
    }
  }

  &__date-picker {
    display: flex;
    align-items: center;
    height: 40px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background-color: var(--card);
    overflow: hidden;
  }

  &__date-input {
    flex: 1;
    height: 100%;
    padding: 0 var(--space-3);
    border: none;
    outline: none;
    font-size: var(--text-base);
    color: var(--foreground);
    background: transparent;
    font-family: var(--font-family);
  }
}

.fullscreen-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.92);
  z-index: 2000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  cursor: pointer;
  animation: fadeIn 0.2s ease;
}

.fullscreen-image {
  max-width: 95vw;
  max-height: 85vh;
  object-fit: contain;
  border-radius: var(--radius);
}

.fullscreen-hint {
  font-size: var(--text-sm);
  color: rgba(255, 255, 255, 0.6);
}

.delete-confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.2s ease;
}

.delete-confirm {
  width: 300px;
  background-color: var(--card);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);

  &__icon {
    font-size: 36px;
  }

  &__title {
    font-size: var(--text-lg);
    font-weight: var(--font-semibold);
    color: var(--foreground);
  }

  &__desc {
    font-size: var(--text-sm);
    color: var(--muted-foreground);
    text-align: center;
    line-height: var(--leading-relaxed);
  }

  &__actions {
    display: flex;
    gap: var(--space-3);
    width: 100%;
    margin-top: var(--space-2);
  }

  &__danger-btn {
    background-color: #EF4444 !important;
    color: #fff !important;
    border-color: #EF4444 !important;

    &:hover {
      background-color: #DC2626 !important;
    }
  }
}
</style>
