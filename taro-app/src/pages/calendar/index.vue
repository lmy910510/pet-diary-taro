<template>
  <view class="page">
    <!-- 日历 -->
    <view class="calendar-section">
      <CalendarGrid
        :events="calendarEvents"
        :selected-date="selectedDate"
        @select="onSelectDate"
      />
    </view>

    <!-- 选中日期事件列表 -->
    <view class="events-section">
      <text class="events-section__title">{{ selectedDateLabel }}</text>

      <view v-if="selectedEvents.length > 0" class="events-list">
        <view
          v-for="evt in selectedEvents"
          :key="evt._id"
          class="event-item"
          @tap="onRecordTap(evt)"
        >
          <view class="event-badge" :style="{ backgroundColor: getTypeConfig(evt.type).lightColor }">
            <text class="event-badge__text" :style="{ color: getTypeConfig(evt.type).color }">
              {{ getTypeConfig(evt.type).label }}
            </text>
          </view>
          <view class="event-item__info">
            <text class="event-item__title">{{ evt.title }}</text>
            <text class="event-item__content">{{ evt.content }}</text>
          </view>
        </view>
      </view>

      <view v-else class="events-empty">
        <text class="events-empty__text">这天还没有安排</text>
      </view>
    </view>

    <!-- Toast -->
    <SToast ref="toastRef" />

    <!-- 记录详情 -->
    <RecordDetailSheet
      v-if="detailRecord"
      :visible="showDetail"
      :record="detailRecord"
      @update:visible="showDetail = $event"
      @delete="onDeleteRecord"
      @edit="onEditRecord"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { RecordType, PetRecord } from '@/types/index'
import { RECORD_TYPE_MAP } from '@/types/index'
import { useRecords } from '@/composables/useRecords'
import CalendarGrid from '@/components/CalendarGrid.vue'
import RecordDetailSheet from '@/components/RecordDetailSheet.vue'
import SToast from '@/components/SToast.vue'

const { records, deleteRecord, updateRecord } = useRecords()

const toastRef = ref<InstanceType<typeof SToast> | null>(null)

const today = new Date()
const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
const selectedDate = ref(todayStr)

interface CalendarEvent {
  date: string
  title: string
  type: RecordType
}

const calendarEvents = computed<CalendarEvent[]>(() => {
  return records.value.map(r => ({
    date: r.eventDate,
    title: r.title,
    type: r.type
  }))
})

const selectedEvents = computed(() => {
  return records.value.filter(r => r.eventDate === selectedDate.value)
})

const selectedDateLabel = computed(() => {
  const parts = selectedDate.value.split('-')
  return `${parseInt(parts[1])}月${parseInt(parts[2])}日`
})

function getTypeConfig(type: RecordType) {
  return RECORD_TYPE_MAP[type]
}

function onSelectDate(date: string) {
  selectedDate.value = date
}

function onRecordTap(record: PetRecord) {
  detailRecord.value = record
  showDetail.value = true
}

const showDetail = ref(false)
const detailRecord = ref<PetRecord | null>(null)

async function onDeleteRecord(id: string) {
  const ok = await deleteRecord(id)
  if (ok) {
    showDetail.value = false
    detailRecord.value = null
    toastRef.value?.show('已删除', 'success')
  } else {
    toastRef.value?.show('删除失败', 'error')
  }
}

async function onEditRecord(data: { id: string; title: string; content: string; eventDate: string; type: string }) {
  const ok = await updateRecord(data.id, {
    title: data.title,
    content: data.content,
    eventDate: data.eventDate,
    type: data.type as RecordType
  })
  if (ok) {
    if (detailRecord.value && detailRecord.value._id === data.id) {
      detailRecord.value = { ...detailRecord.value, title: data.title, content: data.content, eventDate: data.eventDate, type: data.type as RecordType }
    }
    toastRef.value?.show('已更新', 'success')
  } else {
    toastRef.value?.show('更新失败', 'error')
  }
}
</script>

<style lang="scss">
@import '../../styles/variables.scss';

.page {
  min-height: 100vh;
  background-color: $background;
  padding-bottom: calc(160rpx + env(safe-area-inset-bottom));
}

.calendar-section {
  padding: $space-4;
}

.events-section {
  padding: 0 $space-4;

  &__title {
    font-size: $text-base;
    font-weight: $font-semibold;
    color: $foreground;
    margin-bottom: $space-3;
    display: block;
  }
}

.events-list {
  display: flex;
  flex-direction: column;
  gap: $space-3;
}

.event-item {
  display: flex;
  align-items: flex-start;
  gap: $space-3;
  background-color: $card;
  border: 2px solid $border;
  border-radius: $radius;
  padding: $space-3 $space-4;

  &__info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__title {
    font-size: $text-base;
    font-weight: $font-medium;
    color: $foreground;
  }

  &__content {
    font-size: $text-sm;
    color: $muted-foreground;
    line-height: $leading-normal;
  }
}

.event-badge {
  padding: $space-1 $space-2;
  border-radius: $radius-sm;

  &__text {
    font-size: $text-xs;
    font-weight: $font-medium;
  }
}

.events-empty {
  padding: $space-8 0;
  display: flex;
  justify-content: center;

  &__text {
    font-size: $text-base;
    color: $muted-foreground;
  }
}
</style>
