<template>
  <div class="page">
    <!-- 顶部状态栏 -->
    <div class="header">
      <div class="header__inner">
        <div class="header__left">
          <div class="header__avatar">
            <img v-if="pet.avatar && pet.avatar.length > 0" :src="pet.avatar" alt="avatar" class="header__avatar-img" />
            <span v-else class="header__avatar-text">{{ bookEmoji }}</span>
          </div>
          <span class="header__name">{{ pet.name || '我的宠物' }}</span>
        </div>
        <span class="header__date">{{ todayFormatted }}</span>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="content">
      <!-- 加载状态 -->
      <div v-if="isLoading" class="loading-state">
        <div class="loading-state__spinner">
          <div class="loading-state__dot"></div>
          <div class="loading-state__dot"></div>
          <div class="loading-state__dot"></div>
        </div>
        <span class="loading-state__text">正在加载数据...</span>
      </div>

      <template v-else>
        <!-- 金刚区分类 -->
        <div class="vault-grid">
        <div
          v-for="cat in categories"
          :key="cat.type"
          class="vault-grid__item"
          :class="{ 'vault-grid__item--active': activeFilters.includes(cat.type) }"
          @click="onCategoryTap(cat.type)"
        >
          <div class="vault-grid__icon">
            <RecordTypeIcon :type="cat.type" :size="40" />
          </div>
          <span class="vault-grid__label">{{ cat.label }}</span>
          <span class="vault-grid__count">{{ getCount(cat.type) }}</span>
        </div>
      </div>

      <!-- 时间轴记录 -->
      <div v-if="filteredRecords.length > 0" class="timeline">


        <div v-for="(group, gIdx) in groupedRecords" :key="gIdx" class="timeline__group">
          <span class="timeline__date-label">{{ group.label }}</span>
          <div class="timeline__items">
            <div v-for="(record, rIdx) in group.records" :key="record._id" class="timeline__item">
              <div class="timeline__line">
                <div class="timeline__dot" :style="{ backgroundColor: getTypeColor(record.type) }" />
                <div v-if="rIdx < group.records.length - 1" class="timeline__connector" />
              </div>
              <div class="timeline__card">
                <RecordCard :record="record" @tap="onRecordTap(record)" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <EmptyState
        v-else-if="records.length === 0"
        icon="📷"
        title="还没有记录"
        description="拍张照片，让 AI 帮你记录宠物的每一天"
        action-text="开始识别"
        @action="showSheet = true"
      />

      <!-- 筛选空状态 -->
      <EmptyState
        v-else
        icon="📂"
        title="没有此类记录"
        description="当前分类暂无记录"
        action-text="清除筛选"
        @action="activeFilters = []"
      />
      </template>
    </div>

    <!-- AI 识别弹窗 -->
    <AiRecognizeSheet
      :visible="showSheet"
      @update:visible="showSheet = $event"
      @confirm="onConfirm"
    />

    <!-- Toast -->
    <SToast ref="toastRef" />

    <!-- 记录详情弹窗 -->
    <RecordDetailSheet
      v-if="detailRecord"
      :visible="showDetail"
      :record="detailRecord"
      @update:visible="showDetail = $event"
      @delete="onDeleteRecord"
      @edit="onEditRecord"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { PetRecord, RecordType } from '@/types/index'
import { RECORD_TYPE_MAP } from '@/types/index'
import { useRecords } from '@/composables/useRecords'
import { usePet } from '@/composables/usePet'
import { useAuth } from '@/composables/useAuth'
import RecordCard from '@/components/RecordCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import AiRecognizeSheet from '@/components/AiRecognizeSheet.vue'
import RecordDetailSheet from '@/components/RecordDetailSheet.vue'
import SToast from '@/components/SToast.vue'
import RecordTypeIcon from '@/components/icons/RecordTypeIcon.vue'

const { records, recordsLoading, addRecord, deleteRecord, updateRecord } = useRecords()
const { pet, petLoading } = usePet()
const { getBookInfo } = useAuth()

// 获取当前档案的默认 emoji
const bookEmoji = computed(() => getBookInfo().emoji)

// 合并加载状态
const isLoading = computed(() => recordsLoading.value || petLoading.value)
const showSheet = ref(false)
const showDetail = ref(false)
const detailRecord = ref<PetRecord | null>(null)
const toastRef = ref<InstanceType<typeof SToast> | null>(null)
const activeFilters = ref<RecordType[]>([])

const today = new Date()
const todayFormatted = computed(() => {
  const m = today.getMonth() + 1
  const d = today.getDate()
  const weekNames = ['日', '一', '二', '三', '四', '五', '六']
  return `${m}月${d}日 周${weekNames[today.getDay()]}`
})

const categories = computed(() => [
  { ...RECORD_TYPE_MAP.medical, type: 'medical' as RecordType },
  { ...RECORD_TYPE_MAP.diet, type: 'diet' as RecordType },
  { ...RECORD_TYPE_MAP.growth, type: 'growth' as RecordType },
  { ...RECORD_TYPE_MAP.grooming, type: 'grooming' as RecordType }
])

function getCount(type: RecordType): number {
  return records.value.filter(r => r.type === type).length
}

const filteredRecords = computed(() => {
  if (activeFilters.value.length === 0) return records.value
  return records.value.filter(r => activeFilters.value.includes(r.type))
})

interface RecordGroup {
  label: string
  records: PetRecord[]
}

const groupedRecords = computed<RecordGroup[]>(() => {
  const groups: Record<string, PetRecord[]> = {}
  filteredRecords.value.forEach(r => {
    const key = r.eventDate
    if (!groups[key]) groups[key] = []
    groups[key].push(r)
  })

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  return Object.keys(groups)
    .sort((a, b) => b.localeCompare(a))
    .map(date => ({
      label: date === todayStr ? '今天' : formatDateLabel(date),
      records: groups[date]
    }))
})

function formatDateLabel(dateStr: string): string {
  const parts = dateStr.split('-')
  return `${parseInt(parts[1])}月${parseInt(parts[2])}日`
}

function getTypeColor(type: RecordType): string {
  return RECORD_TYPE_MAP[type].color
}

function onCategoryTap(type: RecordType) {
  const idx = activeFilters.value.indexOf(type)
  if (idx >= 0) {
    activeFilters.value.splice(idx, 1)
  } else {
    activeFilters.value.push(type)
  }
}

function onRecordTap(record: PetRecord) {
  detailRecord.value = record
  showDetail.value = true
}

async function onDeleteRecord(record: PetRecord) {
  if (!record._id) return
  await deleteRecord(record._id)
  showDetail.value = false
  detailRecord.value = null
  toastRef.value?.show('已删除', 'success')
}

async function onEditRecord(record: PetRecord, data: Partial<PetRecord>) {
  if (!record._id) return
  await updateRecord(record._id, data)
  toastRef.value?.show('已保存', 'success')
}

async function onConfirm(data: { title: string; content: string; eventDate: string; type: string; imageUrl: string; aiRawData?: Record<string, unknown> }) {
  const result = await addRecord({
    petId: pet.value._id || '',
    type: data.type as RecordType,
    title: data.title,
    content: data.content,
    eventDate: data.eventDate,
    imageUrl: data.imageUrl,
    aiRawData: data.aiRawData,
    status: 'confirmed'
  })
  if (result) {
    toastRef.value?.show('已保存', 'success')
  } else {
    toastRef.value?.show('保存失败', 'error')
  }
}

// 暴露 showSheet 给 TabBar 的加号按钮调用
defineExpose({ showSheet })
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background-color: var(--background);
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-16) var(--space-4);
  gap: var(--space-4);

  &__spinner {
    display: flex;
    gap: var(--space-2);
  }

  &__dot {
    width: 10px;
    height: 10px;
    border-radius: var(--radius-full);
    background-color: var(--primary);
    animation: bounce 1.4s infinite ease-in-out both;

    &:nth-child(1) {
      animation-delay: -0.32s;
    }
    &:nth-child(2) {
      animation-delay: -0.16s;
    }
    &:nth-child(3) {
      animation-delay: 0s;
    }
  }

  &__text {
    font-size: var(--text-sm);
    color: var(--muted-foreground);
  }
}

@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.header {
  position: fixed;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 430px;
  background-color: var(--card);
  border-bottom: 1px solid var(--border);
  z-index: 50;

  &__inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3) var(--space-4);
    height: 56px;
  }

  &__left {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  &__avatar {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-full);
    background-color: var(--muted);
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--border);
  }

  &__avatar-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: var(--radius-full);
  }

  &__avatar-text {
    font-size: 18px;
  }

  &__name {
    font-size: var(--text-lg);
    font-weight: var(--font-semibold);
    color: var(--foreground);
  }

  &__date {
    font-size: var(--text-sm);
    color: var(--muted-foreground);
  }
}

.content {
  padding-top: 60px;
  min-height: 100vh;
  padding-bottom: calc(100px + env(safe-area-inset-bottom));
  overflow-y: auto;
}

.vault-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);

  &__item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: var(--space-3) 0;
    border-radius: var(--radius-lg);
    background-color: var(--card);
    border: 1.5px solid var(--border);
    cursor: pointer;
    transition: all 0.2s ease;

    &:active {
      transform: scale(0.96);
    }

    &--active {
      border-color: var(--primary);
      background-color: var(--card);
      
      .vault-grid__label {
        color: var(--foreground);
        font-weight: var(--font-semibold);
      }
      .vault-grid__count {
        color: var(--muted-foreground);
      }
    }
  }

  &__icon {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__label {
    font-size: 12px;
    font-weight: var(--font-medium);
    color: var(--foreground);
    white-space: nowrap;
  }

  &__count {
    font-size: 11px;
    color: var(--muted-foreground);
    font-variant-numeric: tabular-nums;
  }
}


.timeline {
  padding: var(--space-4);

  &__group {
    margin-bottom: var(--space-5);
  }

  &__date-label {
    font-size: var(--text-sm);
    font-weight: var(--font-semibold);
    color: var(--muted-foreground);
    margin-bottom: var(--space-3);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    display: block;
  }

  &__items {
    display: flex;
    flex-direction: column;
  }

  &__item {
    display: flex;
    flex-direction: row;
  }

  &__line {
    display: none;
  }

  &__dot {
    display: none;
  }

  &__connector {
    display: none;
  }

  &__card {
    flex: 1;
    padding-bottom: var(--space-3);
    min-width: 0;
  }
}
</style>
