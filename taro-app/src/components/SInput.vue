<template>
  <view :class="['s-input-wrapper', focused ? 's-input-wrapper--focused' : '']">
    <input
      v-if="!textarea"
      class="s-input"
      :value="currentValue"
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
      :value="currentValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :maxlength="maxlength"
      :auto-height="autoHeight"
      @input="onInput"
      @focus="focused = true"
      @blur="focused = false"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = withDefaults(defineProps<{
  modelValue?: string
  value?: string  // 兼容 :value 写法
  placeholder?: string
  disabled?: boolean
  type?: string
  textarea?: boolean
  autoHeight?: boolean
  maxlength?: number
}>(), {
  modelValue: '',
  value: '',
  placeholder: '',
  disabled: false,
  type: 'text',
  textarea: false,
  autoHeight: false,
  maxlength: 500
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'input': [value: string]  // 兼容 @input 写法
}>()

// 优先使用 modelValue，其次使用 value
const currentValue = computed(() => props.modelValue || props.value || '')

const focused = ref(false)

function onInput(e: any) {
  const val = e.detail.value
  emit('update:modelValue', val)
  emit('input', val)
}
</script>

<style lang="scss">
@import '../styles/variables.scss';

.s-input-wrapper {
  display: flex;
  width: 100%;
  border: 2px solid $border;
  border-radius: $radius;
  background-color: $card;
  transition: border-color $transition-fast;

  &--focused {
    border-color: $ring;
  }
}

.s-input {
  flex: 1;
  height: 88rpx;
  padding: 0 $space-3;
  font-size: $text-base;
  font-family: $font-family;
  color: $foreground;
  background: transparent;
  border: none;
  outline: none;

  &--textarea {
    height: auto;
    min-height: 180rpx;
    padding: $space-3;
    line-height: $leading-normal;
  }
}

.s-input-placeholder {
  color: $muted-foreground;
}
</style>
