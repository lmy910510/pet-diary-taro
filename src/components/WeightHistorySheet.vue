<template>
  <Teleport to="body">
    <div v-if="visible" class="wh-mask" @click.self="handleClose">
      <div :class="['wh-sheet', show ? 'wh-sheet--visible' : '']">
        <div class="wh-sheet__handle">
          <div class="wh-sheet__bar" />
        </div>

        <div class="wh-sheet__body">
          <span class="wh-sheet__title">⚖️ 体重历史</span>

          <!-- 最新体重摘要 -->
          <div v-if="weightRecords.length > 0" class="wh-sheet__summary">
            <div class="wh-sheet__latest">
              <span class="wh-sheet__latest-label">最新体重</span>
              <span class="wh-sheet__latest-value">{{ latestWeight }} kg</span>
            </div>
            <div v-if="weightTrend" class="wh-sheet__trend">
              <span :class="['wh-sheet__trend-badge', `wh-sheet__trend-badge--${weightTrend.direction}`]">
                {{ weightTrend.icon }} {{ weightTrend.text }}
              </span>
            </div>
          </div>

          <!-- 历史列表 -->
          <div v-if="weightRecords.length > 0" class="wh-sheet__list">
            <div
              v-for="(item, idx) in weightRecords"
              :key="item._id"
              class="wh-sheet__item"
            >
              <div class="wh-sheet__item-left">
                <span class="wh-sheet__item-date">{{ formatDate(item.eventDate) }}</span>
                <span class="wh-sheet__item-detail">抱宠 {{ item.aiRawData?.totalWeight }}kg - 人 {{ item.aiRawData?.humanWeight }}kg</span>
              </div>
              <div class="wh-sheet__item-right">
                <span class="wh-sheet__item-weight">{{ item.aiRawData?.petWeight }} kg</span>
                <span v-if="idx < weightRecords.length - 1" :class="['wh-sheet__item-change', changeClass(item, idx)]">
                  {{ changeText(item, idx) }}
                </span>
              </div>
            </div>
          </div>

          <!-- 空状态 -->
          <div v-else class="wh-sheet__empty">
            <span class="wh-sheet__empty-icon">⚖️</span>
            <span class="wh-sheet__empty-text">还没有体重记录</span>
            <span class="wh-sheet__empty-hint">点击首页 + 号开始记录</span>
          </div>

          <div class="wh-sheet__actions">
            <button class="wh-sheet__close-btn" @click="handleClose">关闭</button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'
import type { PetRecord } from '@/types/index'
import { useRecords } from '@/composables/useRecords'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const show = ref(false)
const { records } = useRecords()

const weightRecords = computed(() => {
  return records.value
    .filter(r => r.type === 'growth' && r.aiRawData?.petWeight != null)
    .sort((a, b) => b.eventDate.localeCompare(a.eventDate))
})

const latestWeight = computed(() => {
  if (weightRecords.value.length === 0) return 0
  return weightRecords.value[0].aiRawData?.petWeight ?? 0
})

const weightTrend = computed(() => {
  if (weightRecords.value.length < 2) return null
  const latest = Number(weightRecords.value[0].aiRawData?.petWeight ?? 0)
  const prev = Number(weightRecords.value[1].aiRawData?.petWeight ?? 0)
  const diff = Math.round((latest - prev) * 10) / 10
  if (diff > 0) return { direction: 'up', icon: '↑', text: `增加 ${diff}kg` }
  if (diff < 0) return { direction: 'down', icon: '↓', text: `减少 ${Math.abs(diff)}kg` }
  return { direction: 'same', icon: '→', text: '持平' }
})

function formatDate(dateStr: string): string {
  const parts = dateStr.split('-')
  return `${parseInt(parts[1])}月${parseInt(parts[2])}日`
}

function changeText(item: PetRecord, idx: number): string {
  const curr = Number(item.aiRawData?.petWeight ?? 0)
  const next = Number(weightRecords.value[idx + 1].aiRawData?.petWeight ?? 0)
  const diff = Math.round((curr - next) * 10) / 10
  if (diff > 0) return `↑${diff}`
  if (diff < 0) return `↓${Math.abs(diff)}`
  return '→ 持平'
}

function changeClass(item: PetRecord, idx: number): string {
  const curr = Number(item.aiRawData?.petWeight ?? 0)
  const next = Number(weightRecords.value[idx + 1].aiRawData?.petWeight ?? 0)
  const diff = curr - next
  if (diff > 0) return 'wh-sheet__item-change--up'
  if (diff < 0) return 'wh-sheet__item-change--down'
  return 'wh-sheet__item-change--same'
}

watch(
  () => props.visible,
  async (val) => {
    if (val) {
      await nextTick()
      setTimeout(() => { show.value = true }, 50)
    } else {
      show.value = false
    }
  }
)

function handleClose() {
  show.value = false
  setTimeout(() => {
    emit('update:visible', false)
  }, 300)
}
</script>

<style lang="scss" scoped>
.wh-mask {
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

.wh-sheet {
  width: 100%;
  max-width: 430px;
  max-height: 80vh;
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

  &__title {
    font-size: var(--text-lg);
    font-weight: var(--font-semibold);
    color: var(--foreground);
  }

  &__summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: linear-gradient(135deg, #FCE4EC 0%, #F3E5F5 100%);
    border-radius: var(--radius);
    padding: var(--space-4);
  }

  &__latest {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  &__latest-label {
    font-size: var(--text-sm);
    color: var(--muted-foreground);
  }

  &__latest-value {
    font-size: 28px;
    font-weight: var(--font-bold);
    color: #E91E63;
  }

  &__trend-badge {
    display: inline-block;
    padding: var(--space-1) var(--space-3);
    border-radius: var(--radius-full);
    font-size: var(--text-sm);
    font-weight: var(--font-medium);

    &--up {
      background-color: #FFF3E0;
      color: #E65100;
    }

    &--down {
      background-color: #E8F5E9;
      color: #2E7D32;
    }

    &--same {
      background-color: var(--muted);
      color: var(--muted-foreground);
    }
  }

  &__list {
    display: flex;
    flex-direction: column;
  }

  &__item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3) 0;
    border-bottom: 1px solid var(--border);

    &:last-child {
      border-bottom: none;
    }
  }

  &__item-left {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__item-date {
    font-size: var(--text-base);
    font-weight: var(--font-medium);
    color: var(--foreground);
  }

  &__item-detail {
    font-size: var(--text-xs);
    color: var(--muted-foreground);
  }

  &__item-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
  }

  &__item-weight {
    font-size: var(--text-base);
    font-weight: var(--font-semibold);
    color: var(--foreground);
  }

  &__item-change {
    font-size: var(--text-xs);
    font-weight: var(--font-medium);

    &--up {
      color: #E65100;
    }

    &--down {
      color: #2E7D32;
    }

    &--same {
      color: var(--muted-foreground);
    }
  }

  &__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-8) 0;
  }

  &__empty-icon {
    font-size: 40px;
    opacity: 0.4;
  }

  &__empty-text {
    font-size: var(--text-base);
    color: var(--foreground);
    font-weight: var(--font-medium);
  }

  &__empty-hint {
    font-size: var(--text-sm);
    color: var(--muted-foreground);
  }

  &__close-btn {
    width: 100%;
    height: 44px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: transparent;
    color: var(--foreground);
    font-size: var(--text-base);
    font-weight: var(--font-medium);
    cursor: pointer;
    transition: all var(--transition-fast);

    &:hover {
      background-color: var(--muted);
    }
  }
}
</style>
