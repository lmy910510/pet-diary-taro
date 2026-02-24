<template>
  <div class="record-card" @click="$emit('tap')">
    <div class="record-card__body">
      <div class="record-card__header">
        <div class="record-card__type-icon">
          <RecordTypeIcon :type="record.type" :size="36" />
        </div>
        <div class="record-card__info">
          <span class="record-card__title">{{ record.title }}</span>
          <span class="record-card__time">{{ record.eventDate }}</span>
        </div>
        <SBadge variant="secondary" :customColor="typeConfig.color">{{ typeConfig.label }}</SBadge>
      </div>
      <span v-if="record.content" class="record-card__content">{{ record.content }}</span>
      <div v-if="record.imageUrl" class="record-card__thumb-row">
        <img :src="record.imageUrl" alt="" class="record-card__thumb" />
        <span class="record-card__thumb-label">查看原图 ›</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PetRecord } from '@/types/index'
import { RECORD_TYPE_MAP } from '@/types/index'
import SBadge from './SBadge.vue'
import RecordTypeIcon from './icons/RecordTypeIcon.vue'

const props = defineProps<{
  record: PetRecord
}>()

defineEmits<{
  tap: []
}>()

const typeConfig = computed(() => RECORD_TYPE_MAP[props.record.type])
</script>

<style lang="scss" scoped>
.record-card {
  display: flex;
  flex-direction: row;
  background-color: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  cursor: pointer;
  transition: background-color var(--transition-fast);

  &:hover {
    background-color: var(--muted);
  }

  &__body {
    flex: 1;
    padding: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  &__header {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: var(--space-3);
  }

  &__type-icon {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  &__info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  &__title {
    font-size: var(--text-base);
    font-weight: var(--font-medium);
    color: var(--foreground);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__time {
    font-size: var(--text-sm);
    color: var(--muted-foreground);
  }

  &__content {
    font-size: var(--text-sm);
    color: var(--muted-foreground);
    line-height: var(--leading-normal);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding-left: 48px;
  }

  &__thumb-row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding-left: 48px;
    margin-top: var(--space-1);
  }

  &__thumb {
    width: 40px;
    height: 40px;
    border-radius: 4px;
    object-fit: cover;
    border: 1px solid var(--border);
  }

  &__thumb-label {
    font-size: var(--text-xs);
    color: var(--primary);
  }
}
</style>
