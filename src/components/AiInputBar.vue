<template>
  <div class="ai-bar" :class="{ 'ai-bar--focus': isFocused }">
    <!-- 图片预览区 -->
    <div v-if="selectedImages.length > 0" class="ai-bar__previews">
      <div
        v-for="(img, idx) in selectedImages"
        :key="idx"
        class="ai-bar__preview-item"
      >
        <img :src="img.url" class="ai-bar__preview-img" />
        <button class="ai-bar__preview-remove" @click="removeImage(idx)">✕</button>
      </div>
    </div>

    <!-- 文本输入区（多行 textarea） -->
    <div class="ai-bar__input-wrap" @click="focusInput">
      <template v-if="!isRecording">
        <textarea
          ref="inputRef"
          v-model="inputText"
          class="ai-bar__textarea"
          placeholder="说点什么，AI 帮你记录..."
          rows="3"
          @keydown.enter.exact.prevent="handleSubmit"
          @focus="isFocused = true"
          @blur="isFocused = false"
        />
      </template>
      <template v-else>
        <div class="ai-bar__transcript">
          <span v-if="transcript" class="ai-bar__transcript-text">{{ transcript }}</span>
          <span v-else class="ai-bar__transcript-placeholder">正在聆听...</span>
          <span class="ai-bar__recording-dot" />
        </div>
      </template>
    </div>

    <!-- 底部工具栏：图片识别(左) + 语音&发送(右) -->
    <div class="ai-bar__toolbar">
      <label class="ai-bar__img-btn">
        <input
          ref="fileInputRef"
          type="file"
          accept="image/*"
          class="ai-bar__file-input"
          @change="onFileChange"
        />
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
          <circle cx="9" cy="9" r="2"/>
          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
        </svg>
        <span class="ai-bar__img-btn-text">图片识别</span>
      </label>

      <div class="ai-bar__toolbar-right">
        <!-- 麦克风按钮 -->
        <button
          v-if="speechSupported"
          class="ai-bar__tool-btn"
          :class="{ 'ai-bar__tool-btn--active': isRecording }"
          @click="toggleRecording"
          :title="isRecording ? '停止录音' : '语音输入'"
        >
          <svg v-if="!isRecording" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" x2="12" y1="19" y2="22"/>
          </svg>
          <svg v-else class="ai-bar__wave-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 10v3"/>
            <path d="M6 6v11"/>
            <path d="M10 3v18"/>
            <path d="M14 8v7"/>
            <path d="M18 5v13"/>
            <path d="M22 10v3"/>
          </svg>
        </button>

        <!-- 发送按钮 -->
        <button
          class="ai-bar__send-btn"
          :class="{ 'ai-bar__send-btn--active': canSubmit }"
          :disabled="!canSubmit && !isRecording"
          @click="handleAction"
        >
          <svg v-if="isRecording" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <rect x="4" y="4" width="16" height="16" rx="2"/>
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m22 2-7 20-4-9-9-4Z"/>
            <path d="M22 2 11 13"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onBeforeUnmount } from 'vue'

interface ImageItem {
  file: File
  url: string
}

const props = defineProps<{
  isRecording: boolean
  transcript: string
  speechSupported: boolean
}>()

const emit = defineEmits<{
  submit: [payload: { text: string; images: File[] }]
  'start-recording': []
  'stop-recording': []
}>()

const inputText = ref('')
const inputRef = ref<HTMLTextAreaElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const selectedImages = ref<ImageItem[]>([])
const isFocused = ref(false)

const canSubmit = computed(() => {
  return (
    inputText.value.trim().length > 0 ||
    selectedImages.value.length > 0 ||
    (props.isRecording && props.transcript.length > 0)
  )
})

function focusInput() {
  if (!props.isRecording) {
    nextTick(() => inputRef.value?.focus())
  }
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    const url = URL.createObjectURL(file)
    selectedImages.value.push({ file, url })
  }
  input.value = ''
}

function removeImage(idx: number) {
  const item = selectedImages.value[idx]
  if (item) {
    URL.revokeObjectURL(item.url)
  }
  selectedImages.value.splice(idx, 1)
}

function clearImages() {
  selectedImages.value.forEach((item) => URL.revokeObjectURL(item.url))
  selectedImages.value = []
}

function toggleRecording() {
  if (props.isRecording) {
    emit('stop-recording')
  } else {
    if (props.speechSupported) {
      inputText.value = ''
      emit('start-recording')
    }
  }
}

function handleSubmit() {
  const text = inputText.value.trim()
  if (!text && selectedImages.value.length === 0) return
  emit('submit', {
    text,
    images: selectedImages.value.map((item) => item.file)
  })
  inputText.value = ''
  clearImages()
}

function handleAction() {
  if (props.isRecording) {
    emit('stop-recording')
  } else {
    handleSubmit()
  }
}

/** 供父组件调用：清空状态 */
function resetBar() {
  inputText.value = ''
  clearImages()
}

defineExpose({ resetBar })

onBeforeUnmount(() => {
  clearImages()
  inputText.value = ''
})
</script>

<style lang="scss" scoped>
.ai-bar {
  display: flex;
  flex-direction: column;
  background-color: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
  overflow: hidden;

  &--focus {
    border-color: var(--ring);
    box-shadow: 0 0 0 2px rgba(77, 182, 172, 0.12);
  }

  // 图片预览
  &__previews {
    display: flex;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-4) 0;
    flex-wrap: wrap;
  }

  &__preview-item {
    position: relative;
    width: 64px;
    height: 64px;
    border-radius: var(--radius);
    overflow: hidden;
    border: 1px solid var(--border);
    flex-shrink: 0;
  }

  &__preview-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &__preview-remove {
    position: absolute;
    top: 2px;
    right: 2px;
    width: 20px;
    height: 20px;
    border: none;
    border-radius: 50%;
    background-color: rgba(0, 0, 0, 0.55);
    color: #fff;
    font-size: 11px;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;

    &:hover {
      background-color: rgba(0, 0, 0, 0.75);
    }
  }

  // 输入区
  &__input-wrap {
    padding: var(--space-3) var(--space-4) 0;
    cursor: text;
  }

  &__textarea {
    width: 100%;
    border: none;
    outline: none;
    background: transparent;
    font-size: var(--text-base);
    color: var(--foreground);
    line-height: 1.6;
    resize: none;
    font-family: inherit;

    &::placeholder {
      color: var(--muted-foreground);
      opacity: 0.5;
    }
  }

  &__transcript {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-height: 72px;
    padding: var(--space-2) 0;
  }

  &__transcript-text {
    font-size: var(--text-base);
    color: var(--foreground);
    line-height: 1.6;
  }

  &__transcript-placeholder {
    font-size: var(--text-base);
    color: var(--muted-foreground);
    opacity: 0.7;
  }

  &__recording-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: #EF4444;
    animation: recDotBlink 1s ease-in-out infinite;
    flex-shrink: 0;
  }

  // 底部工具栏
  &__toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-2);
  }

  &__toolbar-right {
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }

  &__file-input {
    display: none;
  }

  // 图片识别按钮（左侧，AI 亮点功能 - 浅底深字风格）
  &__img-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    // 嵌套圆角：容器 20px - 间距 8px = 12px
    border-radius: 12px;
    cursor: pointer;
    transition: all var(--transition-fast);

    // 浅蓝青渐变背景
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(6, 182, 212, 0.1) 100%);
    color: #2563EB;
    border: 1px solid rgba(59, 130, 246, 0.15);

    &:hover {
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.16) 0%, rgba(6, 182, 212, 0.16) 100%);
      border-color: rgba(59, 130, 246, 0.25);
    }

    &:active {
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.22) 0%, rgba(6, 182, 212, 0.22) 100%);
    }
  }

  &__img-btn-text {
    font-size: var(--text-sm);
    font-weight: var(--font-semibold);
    background: linear-gradient(135deg, #2563EB 0%, #0891B2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  // 工具按钮（麦克风等）
  &__tool-btn {
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 12px;
    background: transparent;
    color: var(--foreground);
    cursor: pointer;
    transition: all var(--transition-fast);

    &:hover {
      background-color: var(--muted);
    }

    &--active {
      background-color: rgba(139, 92, 246, 0.12);
      color: #8B5CF6;

      &:hover {
        background-color: rgba(139, 92, 246, 0.18);
        color: #7C3AED;
      }
    }
  }

  &__wave-icon {
    animation: waveAnim 1.2s ease-in-out infinite;
  }

  // 发送按钮
  &__send-btn {
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 12px;
    background-color: var(--muted);
    color: var(--foreground);
    cursor: pointer;
    transition: all var(--transition-fast);

    &--active {
      background-color: var(--primary);
      color: var(--primary-foreground);
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    &:not(:disabled):hover {
      opacity: 0.85;
    }
  }
}

@keyframes recDotBlink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

@keyframes waveAnim {
  0%, 100% { opacity: 0.6; transform: scaleY(0.85); }
  50% { opacity: 1; transform: scaleY(1.15); }
}
</style>
