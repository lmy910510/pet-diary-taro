<template>
  <div class="confirm-card">
    <div class="confirm-card__header">
      <SBadge :custom-color="typeConfig.color">{{ typeConfig.label }}</SBadge>
      <span class="confirm-card__hint">AI 识别结果</span>
    </div>

    <div class="confirm-card__fields">
      <div class="confirm-card__field">
        <label class="confirm-card__label">标题</label>
        <SInput
          :model-value="editData.title"
          placeholder="事件标题"
          @update:model-value="editData.title = $event"
        />
      </div>
      <div class="confirm-card__field">
        <label class="confirm-card__label">时间</label>
        <div class="confirm-card__date-picker">
          <input
            type="date"
            :value="editData.eventDate"
            @change="editData.eventDate = ($event.target as HTMLInputElement).value"
            class="confirm-card__date-input"
          />
        </div>
      </div>
      <div class="confirm-card__field">
        <label class="confirm-card__label">备注</label>
        <SInput
          :model-value="editData.content"
          placeholder="补充说明（可选）"
          :textarea="true"
          @update:model-value="editData.content = $event"
        />
      </div>
    </div>

    <div class="confirm-card__actions">
      <SButton variant="ghost" size="md" :block="true" @tap="$emit('cancel')">
        放弃
      </SButton>
      <SButton variant="primary" size="md" :block="true" @tap="handleConfirm">
        确认保存
      </SButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch, computed } from 'vue'
import type { RecognizeResult } from '@/types/index'
import { RECORD_TYPE_MAP } from '@/types/index'
import SBadge from './SBadge.vue'
import SButton from './SButton.vue'
import SInput from './SInput.vue'

const props = defineProps<{
  result: RecognizeResult
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

watch(
  () => props.result,
  (val) => {
    if (val) {
      editData.title = val.title
      editData.content = val.content
      editData.eventDate = val.eventDate
    }
  },
  { immediate: true }
)

const typeConfig = computed(() => RECORD_TYPE_MAP[props.result.type])

function handleConfirm() {
  emit('confirm', {
    title: editData.title,
    content: editData.content,
    eventDate: editData.eventDate,
    type: props.result.type
  })
}
</script>

<style lang="scss" scoped>
.confirm-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);

  &__header {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  &__hint {
    font-size: var(--text-sm);
    color: var(--muted-foreground);
  }

  &__fields {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  &__label {
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    color: var(--foreground);
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

  &__actions {
    display: flex;
    gap: var(--space-3);
    padding-top: var(--space-2);
  }
}
</style>
