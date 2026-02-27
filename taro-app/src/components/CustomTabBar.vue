<template>
  <view class="tab-wrapper">
    <view class="tab-bar">
      <!-- 胶囊 Tab 区 -->
      <view class="tab-bar__pill">
        <view
          v-for="tab in tabs"
          :key="tab.path"
          :class="['tab-bar__item', { 'tab-bar__item--active': currentPath === tab.path }]"
          @tap="switchTab(tab.path)"
        >
          <image 
            :src="currentPath === tab.path ? tab.activeIcon : tab.icon" 
            class="tab-bar__icon" 
            mode="aspectFit" 
          />
          <text v-if="currentPath === tab.path" class="tab-bar__label">{{ tab.label }}</text>
        </view>
      </view>

      <!-- 加号按钮 -->
      <view class="tab-bar__fab" @tap="onAddTap">
        <text class="tab-bar__fab-icon">+</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import Taro, { useRouter } from '@tarojs/taro'
import { ref, onMounted, watch } from 'vue'

const emit = defineEmits<{
  add: []
}>()

// 当前路径
const router = useRouter()
const currentPath = ref(router.path || '/pages/vault/index')

// Tab 配置 - 使用 base64 SVG 图标
const tabs = [
  {
    path: '/pages/vault/index',
    label: '档案',
    icon: `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNBOEEyOUUiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0zLjc1IDUuNzVhMSAxIDAgMDExLTFoNC41ODZhMSAxIDAgMDEuNzA3LjI5M2wxLjQxNCAxLjQxNGExIDEgMCAwMC43MDcuMjkzaDYuMDg2YTEgMSAwIDAxMSAxdjEwLjVhMSAxIDAgMDEtMSAxSDQuNzVhMSAxIDAgMDEtMS0xVjUuNzV6Ii8+PC9zdmc+`,
    activeIcon: `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0zLjc1IDUuNzVhMSAxIDAgMDExLTFoNC41ODZhMSAxIDAgMDEuNzA3LjI5M2wxLjQxNCAxLjQxNGExIDEgMCAwMC43MDcuMjkzaDYuMDg2YTEgMSAwIDAxMSAxdjEwLjVhMSAxIDAgMDEtMSAxSDQuNzVhMSAxIDAgMDEtMS0xVjUuNzV6Ii8+PC9zdmc+`
  },
  {
    path: '/pages/calendar/index',
    label: '日历',
    icon: `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNBOEEyOUUiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxyZWN0IHg9IjMiIHk9IjQiIHdpZHRoPSIxOCIgaGVpZ2h0PSIxOCIgcng9IjIiLz48cGF0aCBkPSJNMTYgMnY0TTggMnY0TTMgMTBoMTgiLz48L3N2Zz4=`,
    activeIcon: `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxyZWN0IHg9IjMiIHk9IjQiIHdpZHRoPSIxOCIgaGVpZ2h0PSIxOCIgcng9IjIiLz48cGF0aCBkPSJNMTYgMnY0TTggMnY0TTMgMTBoMTgiLz48L3N2Zz4=`
  },
  {
    path: '/pages/profile/index',
    label: '我的',
    icon: `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNBOEEyOUUiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjEyIiBjeT0iOCIgcj0iNCIvPjxwYXRoIGQ9Ik01IDIwdi0xYTcgNyAwIDAxMTQgMHYxIi8+PC9zdmc+`,
    activeIcon: `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjEyIiBjeT0iOCIgcj0iNCIvPjxwYXRoIGQ9Ik01IDIwdi0xYTcgNyAwIDAxMTQgMHYxIi8+PC9zdmc+`
  }
]

// 切换 Tab
function switchTab(path: string) {
  if (currentPath.value === path) return
  currentPath.value = path
  Taro.switchTab({ url: path })
}

// 点击添加按钮
function onAddTap() {
  emit('add')
}

// 监听页面显示，更新当前路径
onMounted(() => {
  // 获取当前页面路径
  const pages = Taro.getCurrentPages()
  if (pages.length > 0) {
    const page = pages[pages.length - 1]
    currentPath.value = '/' + page.route
  }
})
</script>

<style lang="scss">
.tab-wrapper {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  pointer-events: none;
  padding: 0 32rpx calc(16rpx + env(safe-area-inset-bottom)) 32rpx;
}

.tab-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20rpx;
  pointer-events: auto;

  /* 胶囊容器 */
  &__pill {
    display: flex;
    align-items: center;
    height: 112rpx;
    background: rgba(250, 250, 249, 0.92);
    border-radius: 56rpx;
    padding: 0 12rpx;
    gap: 4rpx;
    box-shadow:
      0 0 0 1rpx rgba(0, 0, 0, 0.04),
      0 2rpx 2rpx rgba(0, 0, 0, 0.02),
      0 4rpx 16rpx rgba(0, 0, 0, 0.06),
      0 16rpx 48rpx rgba(0, 0, 0, 0.06);
  }

  /* 单个 Tab */
  &__item {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10rpx;
    height: 88rpx;
    padding: 0 32rpx;
    border-radius: 44rpx;
    color: #A8A29E;
    transition: all 0.3s ease;

    &--active {
      color: #FFFFFF;
      background: #1C1917;
      padding: 0 36rpx;
      box-shadow:
        inset 0 2rpx 0 rgba(255, 255, 255, 0.1),
        0 2rpx 8rpx rgba(0, 0, 0, 0.15);
    }
  }

  /* 图标 */
  &__icon {
    width: 44rpx;
    height: 44rpx;
    flex-shrink: 0;
  }

  /* 文字标签 */
  &__label {
    font-size: 28rpx;
    font-weight: 600;
    line-height: 1;
    white-space: nowrap;
  }

  /* 加号 FAB */
  &__fab {
    width: 112rpx;
    height: 112rpx;
    border-radius: 50%;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #78716C;
    background: rgba(250, 250, 249, 0.92);
    box-shadow:
      0 0 0 1rpx rgba(0, 0, 0, 0.04),
      0 2rpx 2rpx rgba(0, 0, 0, 0.02),
      0 4rpx 16rpx rgba(0, 0, 0, 0.06),
      0 16rpx 48rpx rgba(0, 0, 0, 0.06);
    transition: all 0.2s ease;

    &:active {
      transform: scale(0.92);
      background: rgba(240, 240, 238, 0.95);
    }
  }

  &__fab-icon {
    font-size: 56rpx;
    font-weight: 300;
    line-height: 1;
  }
}
</style>
