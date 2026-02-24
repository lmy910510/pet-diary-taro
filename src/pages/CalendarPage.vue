<template>
  <div class="page">
    <!-- 日历 -->
    <div class="calendar-section">
      <CalendarGrid
        :events="calendarEvents"
        :selected-date="selectedDate"
        @select="onSelectDate"
      />
    </div>

    <!-- 选中日期事件列表 -->
    <div class="events-section">
      <span class="events-section__title">{{ selectedDateLabel }}</span>

      <div v-if="selectedEvents.length > 0" class="events-list">
        <div
          v-for="evt in selectedEvents"
          :key="evt._id"
          class="event-item"
          @click="onRecordTap(evt)"
        >
          <SBadge :custom-color="getTypeConfig(evt.type).color">
            {{ getTypeConfig(evt.type).label }}
          </SBadge>
          <div class="event-item__info">
            <span class="event-item__title">{{ evt.title }}</span>
            <span class="event-item__content">{{ evt.content }}</span>
          </div>
        </div>
      </div>

      <div v-else class="events-empty">
        <span class="events-empty__text">这天还没有安排</span>
      </div>
    </div>

    <!-- 记录详情弹窗 -->
    <RecordDetailSheet
      v-if="detailRecord"
      :visible="showDetail"
      :record="detailRecord"
      @update:visible="showDetail = $event"
      @delete="onDeleteRecord"
    />

    <!-- Toast -->
    <SToast ref="toastRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { RecordType, PetRecord } from '@/types/index'
import { RECORD_TYPE_MAP } from '@/types/index'
import { useRecords } from '@/composables/useRecords'
import type { CalendarEvent } from '@/components/CalendarGrid.vue'
import CalendarGrid from '@/components/CalendarGrid.vue'
import SBadge from '@/components/SBadge.vue'
import RecordDetailSheet from '@/components/RecordDetailSheet.vue'
import SToast from '@/components/SToast.vue'

const { records, deleteRecord } = useRecords()

const showDetail = ref(false)
const detailRecord = ref<PetRecord | null>(null)
const toastRef = ref<InstanceType<typeof SToast> | null>(null)

const today = new Date()
const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
const selectedDate = ref(todayStr)

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

async function onDeleteRecord(record: PetRecord) {
  if (!record._id) return
  await deleteRecord(record._id)
  showDetail.value = false
  detailRecord.value = null
  toastRef.value?.show('已删除', 'success')
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background-color: var(--background);
  padding-bottom: calc(80px + env(safe-area-inset-bottom));
}

.calendar-section {
  padding: var(--space-4);
}

.events-section {
  padding: 0 var(--space-4);

  &__title {
    font-size: var(--text-base);
    font-weight: var(--font-semibold);
    color: var(--foreground);
    margin-bottom: var(--space-3);
    display: block;
  }
}

.events-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.event-item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  background-color: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: var(--space-3) var(--space-4);

  &__info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__title {
    font-size: var(--text-base);
    font-weight: var(--font-medium);
    color: var(--foreground);
  }

  &__content {
    font-size: var(--text-sm);
    color: var(--muted-foreground);
    line-height: var(--leading-normal);
  }
}

.events-empty {
  padding: var(--space-8) 0;
  display: flex;
  justify-content: center;

  &__text {
    font-size: var(--text-base);
    color: var(--muted-foreground);
  }
}
</style>
