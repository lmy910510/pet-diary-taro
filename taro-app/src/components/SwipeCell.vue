<template>
  <view 
    class="swipe-cell" 
    :catchMove="isSwiping"
    @touchstart="onTouchStart" 
    @touchmove="onTouchMove" 
    @touchend="onTouchEnd"
    @touchcancel="onTouchEnd"
  >
    <view 
      class="swipe-cell__wrapper" 
      :style="wrapperStyle"
    >
      <view class="swipe-cell__content">
        <slot />
      </view>
      <view class="swipe-cell__actions" :style="{ width: `${actionWidth}px` }">
        <view class="swipe-cell__delete" @tap.stop="onDelete">
          <image src="/static/icons/trash.svg" class="swipe-cell__delete-icon" mode="aspectFit" />
          <text class="swipe-cell__delete-text">删除</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script lang="ts">
// 模块级变量：所有 SwipeCell 实例共享，用于追踪当前打开的实例
let currentOpenedCell: { close: () => void } | null = null
</script>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'

const emit = defineEmits<{
  delete: []
  'swipe-start': []
  'swipe-end': []
}>()

// 删除按钮宽度
const actionWidth = 80

// 响应式状态 —— 仅用于 touchend 吸附动画
const offsetX = ref(0)
const animating = ref(false)
const isSwiping = ref(false)

// 非响应式状态
let _startX = 0
let _startY = 0
let _currentX = 0       // 实时追踪当前偏移（非响应式）
let _isOpened = false
let _isHorizontal: boolean | null = null
let _hasEmittedStart = false

const wrapperStyle = computed(() => ({
  transform: `translate3d(${offsetX.value}px, 0, 0)`,
  transition: animating.value ? 'transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none',
  willChange: 'transform'
}))

// 当前实例的引用
const selfInstance = {
  close: () => {
    animating.value = true
    offsetX.value = 0
    _currentX = 0
    _isOpened = false
  }
}

function onTouchStart(e: TouchEvent) {
  const touch = e.touches[0]
  _startX = touch.clientX
  _startY = touch.clientY
  _isHorizontal = null
  _hasEmittedStart = false
  animating.value = false
  
  // 如果有其他打开的 cell，先关闭它
  if (currentOpenedCell && currentOpenedCell !== selfInstance) {
    currentOpenedCell.close()
    currentOpenedCell = null
  }
}

function onTouchMove(e: TouchEvent) {
  const touch = e.touches[0]
  const deltaX = touch.clientX - _startX
  const deltaY = touch.clientY - _startY

  // 首次移动时判断方向
  if (_isHorizontal === null) {
    const absX = Math.abs(deltaX)
    const absY = Math.abs(deltaY)
    if (absX < 3 && absY < 3) return
    
    if (absX > absY) {
      _isHorizontal = true
      isSwiping.value = true
      if (!_hasEmittedStart) {
        _hasEmittedStart = true
        emit('swipe-start')
      }
    } else {
      _isHorizontal = false
      return
    }
  }

  if (!_isHorizontal) return

  let newOffset = deltaX
  if (_isOpened) {
    newOffset = deltaX - actionWidth
  }

  // 限制范围 + 加阻尼
  if (newOffset > 0) {
    newOffset = 0
  } else if (newOffset < -actionWidth) {
    // 超出部分加阻尼效果，拉越远越难拉
    const over = -newOffset - actionWidth
    newOffset = -(actionWidth + over * 0.3)
  }

  // 直接更新（translate3d 启用 GPU 加速）
  offsetX.value = newOffset
  _currentX = newOffset
}

function onTouchEnd() {
  animating.value = true

  if (_isHorizontal) {
    isSwiping.value = false
    if (_currentX < -actionWidth / 3) {
      offsetX.value = -actionWidth
      _currentX = -actionWidth
      _isOpened = true
      currentOpenedCell = selfInstance
    } else {
      offsetX.value = 0
      _currentX = 0
      _isOpened = false
      if (currentOpenedCell === selfInstance) {
        currentOpenedCell = null
      }
    }
  }

  if (_hasEmittedStart) {
    emit('swipe-end')
    _hasEmittedStart = false
  }

  _isHorizontal = null
}

function onDelete() {
  animating.value = true
  offsetX.value = 0
  _currentX = 0
  _isOpened = false
  currentOpenedCell = null
  emit('delete')
}

function close() {
  animating.value = true
  offsetX.value = 0
  _currentX = 0
  _isOpened = false
  if (currentOpenedCell === selfInstance) {
    currentOpenedCell = null
  }
}

onUnmounted(() => {
  if (currentOpenedCell === selfInstance) {
    currentOpenedCell = null
  }
})

defineExpose({ close })
</script>

<style lang="scss">
.swipe-cell {
  overflow: hidden;
  position: relative;
  border-radius: 36rpx;
  // 开启硬件加速
  will-change: transform;

  &__wrapper {
    display: flex;
    width: 100%;
    will-change: transform;
  }

  &__content {
    flex-shrink: 0;
    width: 100%;
  }

  &__actions {
    flex-shrink: 0;
    display: flex;
    align-items: stretch;
  }

  &__delete {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4rpx;
    width: 100%;
    background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
    color: white;
    border-radius: 0 36rpx 36rpx 0;

    &:active {
      opacity: 0.85;
    }
  }

  &__delete-icon {
    width: 36rpx;
    height: 36rpx;
    filter: brightness(0) invert(1);
  }

  &__delete-text {
    font-size: 22rpx;
    font-weight: 600;
  }
}
</style>
