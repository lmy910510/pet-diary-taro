<template>
  <div :class="['s-input-wrapper', focused ? 's-input-wrapper--focused' : '']">
    <input
      v-if="!textarea"
      class="s-input"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :type="type"
      :maxlength="maxlength"
      @input="onInput"
      @focus="focused = true"
      @blur="focused = false"
    />
    <textarea
      v-else
      class="s-input s-input--textarea"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :maxlength="maxlength"
      @input="onInput"
      @focus="focused = true"
      @blur="focused = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

withDefaults(defineProps<{
  modelValue?: string
  placeholder?: string
  disabled?: boolean
  type?: string
  textarea?: boolean
  autoHeight?: boolean
  maxlength?: number
}>(), {
  modelValue: '',
  placeholder: '',
  disabled: false,
  type: 'text',
  textarea: false,
  autoHeight: false,
  maxlength: 200
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const focused = ref(false)

function onInput(e: Event) {
  const target = e.target as HTMLInputElement | HTMLTextAreaElement
  emit('update:modelValue', target.value)
}
</script>

<style lang="scss" scoped>
.s-input-wrapper {
  display: flex;
  width: 100%;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background-color: var(--card);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);

  &--focused {
    border-color: var(--ring);
    box-shadow: 0 0 0 2px rgba(77, 182, 172, 0.15);
  }
}

.s-input {
  flex: 1;
  height: 40px;
  padding: 0 var(--space-3);
  font-size: var(--text-base);
  font-family: var(--font-family);
  color: var(--foreground);
  background: transparent;
  border: none;
  outline: none;

  &--textarea {
    height: auto;
    min-height: 80px;
    padding: var(--space-3);
    line-height: var(--leading-normal);
    resize: vertical;
  }
}

.s-input::placeholder {
  color: var(--muted-foreground);
}
</style>
