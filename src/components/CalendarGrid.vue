<template>
  <div class="calendar-grid">
    <div class="calendar-grid__nav">
      <div class="calendar-grid__nav-btn" @click="prevMonth">
        <span class="calendar-grid__arrow">‹</span>
      </div>
      <span class="calendar-grid__month">{{ currentYear }}年{{ currentMonth }}月</span>
      <div class="calendar-grid__nav-btn" @click="nextMonth">
        <span class="calendar-grid__arrow">›</span>
      </div>
    </div>

    <div class="calendar-grid__weekdays">
      <span v-for="day in weekDays" :key="day" class="calendar-grid__weekday">{{ day }}</span>
    </div>

    <div class="calendar-grid__days">
      <div
        v-for="(cell, idx) in calendarCells"
        :key="idx"
        :class="[
          'calendar-grid__cell',
          cell.isToday ? 'calendar-grid__cell--today' : '',
          cell.isSelected ? 'calendar-grid__cell--selected' : '',
          !cell.isCurrentMonth ? 'calendar-grid__cell--muted' : ''
        ]"
        @click="selectDate(cell)"
      >
        <span class="calendar-grid__date">{{ cell.day }}</span>
        <div v-if="cell.events.length > 0" class="calendar-grid__dots">
          <div
            v-for="(evt, eidx) in cell.events.slice(0, 3)"
            :key="eidx"
            class="calendar-grid__dot"
            :style="{ backgroundColor: evt.color }"
          />
        </div>
      </div>
    </div>
  </div>
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

<style lang="scss" scoped>
.calendar-grid {
  background-color: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;

  &__nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4);
  }

  &__nav-btn {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius);
    cursor: pointer;
    &:hover { background-color: var(--muted); }
  }

  &__arrow {
    font-size: var(--text-xl);
    color: var(--foreground);
    font-weight: var(--font-medium);
  }

  &__month {
    font-size: var(--text-lg);
    font-weight: var(--font-semibold);
    color: var(--foreground);
  }

  &__weekdays {
    display: flex;
    padding: 0 var(--space-2) var(--space-2);
  }

  &__weekday {
    flex: 1;
    text-align: center;
    font-size: var(--text-sm);
    color: var(--muted-foreground);
  }

  &__days {
    display: flex;
    flex-wrap: wrap;
    padding: 0 var(--space-2) var(--space-3);
  }

  &__cell {
    width: calc(100% / 7);
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--space-1) 0;
    gap: 2px;
    cursor: pointer;
  }

  &__date {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--text-base);
    color: var(--foreground);
    border-radius: var(--radius-full);
    transition: background-color var(--transition-fast);
  }

  &__cell:hover &__date {
    background-color: var(--muted);
  }

  &__cell--today &__date {
    background-color: var(--primary);
    color: var(--primary-foreground);
    font-weight: var(--font-semibold);
  }

  &__cell--selected:not(.calendar-grid__cell--today) &__date {
    background-color: var(--muted);
  }

  &__cell--muted &__date {
    color: var(--muted-foreground);
    opacity: 0.5;
  }

  &__dots {
    display: flex;
    gap: 2px;
    height: 4px;
  }

  &__dot {
    width: 4px;
    height: 4px;
    border-radius: 50%;
  }
}
</style>
