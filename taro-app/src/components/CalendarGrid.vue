<template>
  <view class="calendar-grid">
    <view class="calendar-grid__nav">
      <view class="calendar-grid__nav-btn" @tap="prevMonth">
        <text class="calendar-grid__arrow">‹</text>
      </view>
      <text class="calendar-grid__month">{{ currentYear }}年{{ currentMonth }}月</text>
      <view class="calendar-grid__nav-btn" @tap="nextMonth">
        <text class="calendar-grid__arrow">›</text>
      </view>
    </view>

    <view class="calendar-grid__weekdays">
      <text v-for="day in weekDays" :key="day" class="calendar-grid__weekday">{{ day }}</text>
    </view>

    <view class="calendar-grid__days">
      <view
        v-for="(cell, idx) in calendarCells"
        :key="idx"
        :class="[
          'calendar-grid__cell',
          cell.isToday ? 'calendar-grid__cell--today' : '',
          cell.isSelected ? 'calendar-grid__cell--selected' : '',
          !cell.isCurrentMonth ? 'calendar-grid__cell--muted' : ''
        ]"
        @tap="selectDate(cell)"
      >
        <text class="calendar-grid__date">{{ cell.day }}</text>
        <view v-if="cell.events.length > 0" class="calendar-grid__dots">
          <view
            v-for="(evt, eidx) in cell.events.slice(0, 3)"
            :key="eidx"
            class="calendar-grid__dot"
            :style="{ backgroundColor: evt.color }"
          />
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { RecordType } from '@/types/index'
import { RECORD_TYPE_MAP } from '@/types/index'

export interface CalendarEvent {
  date: string
  title: string
  type: RecordType
}

interface CalendarCell {
  day: number
  date: string
  isCurrentMonth: boolean
  isToday: boolean
  isSelected: boolean
  events: Array<{ color: string; title: string }>
}

const props = withDefaults(defineProps<{
  events?: CalendarEvent[]
  selectedDate?: string
}>(), {
  events: () => [],
  selectedDate: ''
})

const emit = defineEmits<{
  select: [date: string]
  'month-change': [year: number, month: number]
}>()

const weekDays = ['一', '二', '三', '四', '五', '六', '日']
const today = new Date()
const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

const currentYear = ref(today.getFullYear())
const currentMonth = ref(today.getMonth() + 1)

function prevMonth() {
  if (currentMonth.value === 1) {
    currentMonth.value = 12
    currentYear.value--
  } else {
    currentMonth.value--
  }
  emit('month-change', currentYear.value, currentMonth.value)
}

function nextMonth() {
  if (currentMonth.value === 12) {
    currentMonth.value = 1
    currentYear.value++
  } else {
    currentMonth.value++
  }
  emit('month-change', currentYear.value, currentMonth.value)
}

function formatDate(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

const calendarCells = computed<CalendarCell[]>(() => {
  const y = currentYear.value
  const m = currentMonth.value
  const lastDay = new Date(y, m, 0)
  const daysInMonth = lastDay.getDate()

  let startWeekday = new Date(y, m - 1, 1).getDay() - 1
  if (startWeekday < 0) startWeekday = 6

  const cells: CalendarCell[] = []

  const prevLastDay = new Date(y, m - 1, 0).getDate()
  for (let i = startWeekday - 1; i >= 0; i--) {
    const d = prevLastDay - i
    const pm = m === 1 ? 12 : m - 1
    const py = m === 1 ? y - 1 : y
    const dateStr = formatDate(py, pm, d)
    cells.push({
      day: d, date: dateStr, isCurrentMonth: false,
      isToday: dateStr === todayStr, isSelected: dateStr === props.selectedDate,
      events: getEventsForDate(dateStr)
    })
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = formatDate(y, m, d)
    cells.push({
      day: d, date: dateStr, isCurrentMonth: true,
      isToday: dateStr === todayStr, isSelected: dateStr === props.selectedDate,
      events: getEventsForDate(dateStr)
    })
  }

  const remaining = 42 - cells.length
  for (let d = 1; d <= remaining; d++) {
    const nm = m === 12 ? 1 : m + 1
    const ny = m === 12 ? y + 1 : y
    const dateStr = formatDate(ny, nm, d)
    cells.push({
      day: d, date: dateStr, isCurrentMonth: false,
      isToday: dateStr === todayStr, isSelected: dateStr === props.selectedDate,
      events: getEventsForDate(dateStr)
    })
  }

  return cells
})

function getEventsForDate(date: string) {
  return props.events
    .filter(e => e.date === date)
    .map(e => ({ color: RECORD_TYPE_MAP[e.type].color, title: e.title }))
}

function selectDate(cell: CalendarCell) {
  emit('select', cell.date)
}
</script>

<style lang="scss">
@import '../styles/variables.scss';

.calendar-grid {
  background-color: $card;
  border: 2px solid $border;
  border-radius: $radius;
  overflow: hidden;

  &__nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: $space-4;
  }

  &__nav-btn {
    width: 72px;
    height: 72px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: $radius;
  }

  &__arrow {
    font-size: $text-xl;
    color: $foreground;
    font-weight: $font-medium;
  }

  &__month {
    font-size: $text-lg;
    font-weight: $font-semibold;
    color: $foreground;
  }

  &__weekdays {
    display: flex;
    padding: 0 $space-2 $space-2;
  }

  &__weekday {
    flex: 1;
    text-align: center;
    font-size: $text-sm;
    color: $muted-foreground;
  }

  &__days {
    display: flex;
    flex-wrap: wrap;
    padding: 0 $space-2 $space-3;
  }

  &__cell {
    width: calc(100% / 7);
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: $space-1 0;
    gap: 4px;
  }

  &__date {
    width: 64px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: $text-base;
    color: $foreground;
    border-radius: $radius-full;
    transition: background-color $transition-fast;
  }

  &__cell--today &__date {
    background-color: $primary;
    color: $primary-foreground;
    font-weight: $font-semibold;
  }

  &__cell--selected:not(.calendar-grid__cell--today) &__date {
    background-color: $muted;
  }

  &__cell--muted &__date {
    color: $muted-foreground;
    opacity: 0.5;
  }

  &__dots {
    display: flex;
    gap: 4px;
    height: 8px;
  }

  &__dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }
}
</style>
