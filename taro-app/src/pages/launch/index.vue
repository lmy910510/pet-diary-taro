<template>
  <view class="page">
    <!-- Logo 区域 -->
    <view class="logo-section">
      <image src="/static/icons/logo.png" class="logo" mode="aspectFit" />
      <text class="logo__title">毛坨日记</text>
      <text class="logo__subtitle">AI 智能宠物生活管家</text>
    </view>

    <!-- 加载状态 -->
    <view v-if="isLoading" class="loading-section">
      <view class="loading-spinner">
        <view class="loading-spinner__dot" />
        <view class="loading-spinner__dot" />
        <view class="loading-spinner__dot" />
      </view>
      <text class="loading-section__text">{{ loadingText }}</text>
    </view>

    <!-- 首次使用引导 / 登录页面 -->
    <view v-else class="welcome-section">
      <text class="welcome-section__text">首次使用，点击下方按钮开始</text>
      <button class="btn btn--primary btn--large" @tap="startLogin">
        微信登录
      </button>
    </view>

    <!-- Toast -->
    <SToast ref="toastRef" />
  </view>
</template>

<script setup lang="ts">
import Taro from '@tarojs/taro'
import { ref, onMounted } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { usePet } from '@/composables/usePet'
import { useRecords } from '@/composables/useRecords'
import SToast from '@/components/SToast.vue'

const { 
  isLoggedIn,
  allBooks,
  silentLogin,
  login,
  selectBook: authSelectBook,
  createBook
} = useAuth()

const { loadPet, migrateLocalData: migratePetData } = usePet()
const { loadRecords, migrateLocalData: migrateRecordsData } = useRecords()

const toastRef = ref<InstanceType<typeof SToast> | null>(null)
const isLoading = ref(true)
const loadingText = ref('正在连接...')

onMounted(async () => {
  await initApp()
})

async function initApp() {
  isLoading.value = true
  loadingText.value = '正在连接...'
  
  try {
    // 尝试静默登录
    const success = await silentLogin()
    
    if (success && allBooks.value.length > 0) {
      // 已登录且有档案，迁移数据后直接进入第一个档案
      loadingText.value = '检查本地数据...'
      await migratePetData()
      await migrateRecordsData()
      
      // 自动进入第一个档案
      await enterFirstBook()
    } else if (success && allBooks.value.length === 0) {
      // 已登录但没有档案，创建默认档案
      loadingText.value = '正在初始化...'
      const book = await createBook('我的宠物')
      if (book) {
        await enterFirstBook()
      } else {
        isLoading.value = false
      }
    } else {
      // 未登录，显示登录按钮
      isLoading.value = false
    }
  } catch (err) {
    console.error('[Launch] 初始化失败:', err)
    isLoading.value = false
  }
}

// 进入第一个档案并跳转到主页
async function enterFirstBook() {
  const firstBook = allBooks.value[0]
  if (!firstBook) {
    isLoading.value = false
    return
  }
  
  loadingText.value = '正在加载档案...'
  
  try {
    await authSelectBook(firstBook.bookId)
    await Promise.all([loadPet(), loadRecords()])
    
    // 跳转到档案页（首页），使用 reLaunch 清除页面栈
    Taro.reLaunch({ url: '/pages/vault/index' })
  } catch (err) {
    console.error('[Launch] 进入档案失败:', err)
    isLoading.value = false
  }
}

async function startLogin() {
  isLoading.value = true
  loadingText.value = '正在登录...'
  
  try {
    const user = await login()
    
    if (user) {
      toastRef.value?.show('登录成功', 'success')
      
      // 登录成功后，检查是否有档案
      if (allBooks.value.length > 0) {
        await enterFirstBook()
      } else {
        // 没有档案，创建默认档案
        loadingText.value = '正在初始化...'
        const book = await createBook('我的宠物')
        if (book) {
          await enterFirstBook()
        } else {
          isLoading.value = false
        }
      }
    } else {
      isLoading.value = false
    }
  } catch (err) {
    console.error('[Launch] 登录失败:', err)
    toastRef.value?.show('登录失败，请重试', 'error')
    isLoading.value = false
  }
}
</script>

<style lang="scss">
@import '../../styles/variables.scss';

.page {
  min-height: 100vh;
  background: #FFFFFF;
  display: flex;
  flex-direction: column;
  padding: 0 $space-6;
  padding-top: 120rpx;
  padding-bottom: env(safe-area-inset-bottom);
}

.logo-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: $space-8 0;
}

.logo {
  width: 200rpx;
  height: 200rpx;
  border-radius: 44rpx;
  margin-bottom: $space-4;

  &__title {
    font-size: 64rpx;
    font-weight: $font-semibold;
    color: $foreground;
    margin-bottom: $space-1;
  }

  &__subtitle {
    font-size: $text-sm;
    color: $muted-foreground;
  }
}

.loading-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: $space-4;

  &__text {
    font-size: $text-sm;
    color: $muted-foreground;
  }
}

.loading-spinner {
  display: flex;
  gap: 16rpx;

  &__dot {
    width: 20rpx;
    height: 20rpx;
    border-radius: 50%;
    background-color: $primary;
    animation: bounce 1.4s infinite ease-in-out both;

    &:nth-child(1) { animation-delay: -0.32s; }
    &:nth-child(2) { animation-delay: -0.16s; }
    &:nth-child(3) { animation-delay: 0s; }
  }
}

@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: $space-4;
  border-radius: $radius;
  font-size: $text-base;
  font-weight: $font-medium;
  border: none;
  transition: all 0.2s ease;

  &--primary {
    background-color: $primary;
    color: white;

    &:active {
      background-color: darken(#FF6B6B, 10%);
    }
  }

  &--large {
    padding: $space-5;
    font-size: $text-lg;
  }
}

.welcome-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: $space-6;

  &__text {
    font-size: $text-sm;
    color: $muted-foreground;
  }
}
</style>
