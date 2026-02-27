<template>
  <view class="page">
    <!-- 头像区 -->
    <view class="profile-header">
      <view class="profile-header__avatar-group">
        <!-- 宠物主头像 -->
        <view class="profile-header__avatar" @tap="changeAvatar">
          <image v-if="pet.avatar" :src="pet.avatar" class="profile-header__avatar-img" mode="aspectFill" />
          <image v-else class="profile-header__avatar-img" :src="DEFAULT_PET_ICON" mode="aspectFit" />
        </view>

        <!-- 主人1头像（右下角） -->
        <view
          class="profile-header__owner profile-header__owner--first"
          @tap="owners.length > 0 ? onOwnerTap(0) : addOwner(0)"
        >
          <image v-if="owners.length > 0 && owners[0].avatar" :src="owners[0].avatar" class="profile-header__owner-img" mode="aspectFill" />
          <view v-else class="profile-header__owner-placeholder">
            <text class="profile-header__owner-icon">+</text>
          </view>
        </view>

        <!-- 主人2头像（左下角） -->
        <view
          v-if="owners.length >= 1"
          class="profile-header__owner profile-header__owner--second"
          @tap="owners.length > 1 ? onOwnerTap(1) : addOwner(1)"
        >
          <image v-if="owners.length > 1 && owners[1].avatar" :src="owners[1].avatar" class="profile-header__owner-img" mode="aspectFill" />
          <view v-else class="profile-header__owner-placeholder">
            <text class="profile-header__owner-icon">+</text>
          </view>
        </view>
      </view>
      <text class="profile-header__name">{{ pet.name || '我的宠物' }}</text>
    </view>

    <!-- 基本信息 -->
    <view class="section">
      <text class="section__label">基本信息</text>
      <view class="info-card">
        <view class="info-item" @tap="editField('name')">
          <text class="info-item__label">名字</text>
          <view class="info-item__right">
            <text class="info-item__value">{{ pet.name || '未设置' }}</text>
            <text class="info-item__chevron">›</text>
          </view>
        </view>
        <view class="info-item" @tap="editField('breed')">
          <text class="info-item__label">品种</text>
          <view class="info-item__right">
            <text class="info-item__value">{{ pet.breed || '未设置' }}</text>
            <text class="info-item__chevron">›</text>
          </view>
        </view>
        <view class="info-item" @tap="editField('birthday')">
          <text class="info-item__label">生日</text>
          <view class="info-item__right">
            <text class="info-item__value">{{ pet.birthday || '未设置' }}</text>
            <text class="info-item__chevron">›</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 档案信息 -->
    <view class="section">
      <text class="section__label">档案信息</text>
      <view class="info-card">
        <view class="info-item">
          <text class="info-item__label">当前档案</text>
          <view class="info-item__right">
            <text class="info-item__value">{{ bookInfo.name }}</text>
          </view>
        </view>
        <view class="info-item">
          <text class="info-item__label">档案 ID</text>
          <view class="info-item__right">
            <text class="info-item__value info-item__value--small">{{ currentBookId || '-' }}</text>
          </view>
        </view>
        <view v-if="bookInfo.isOwner" class="info-item" @tap="copyShareCode">
          <text class="info-item__label">分享码</text>
          <view class="info-item__right">
            <text v-if="shareCodeLoading" class="info-item__value">生成中...</text>
            <text v-else class="info-item__value info-item__value--code">{{ shareCode || '点击生成' }}</text>
            <text class="info-item__chevron">{{ shareCode ? '复制' : '›' }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 设置 -->
    <view class="section">
      <text class="section__label">设置</text>
      <view class="info-card">
        <view class="info-item" @tap="switchBook">
          <text class="info-item__label">切换/新建档案</text>
          <view class="info-item__right">
            <text class="info-item__chevron">›</text>
          </view>
        </view>
        <view class="info-item" @tap="handleJoinBook">
          <text class="info-item__label">加入他人档案</text>
          <view class="info-item__right">
            <text class="info-item__chevron">›</text>
          </view>
        </view>
        <view class="info-item" @tap="showAbout">
          <text class="info-item__label">关于我们</text>
          <view class="info-item__right">
            <text class="info-item__chevron">›</text>
          </view>
        </view>
        <view class="info-item info-item--danger" @tap="handleLogout">
          <text class="info-item__label" style="color: #ef4444;">退出登录</text>
          <view class="info-item__right">
            <text class="info-item__chevron">›</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 版本号 -->
    <text class="version">毛坨日记 v1.0.0</text>

    <!-- Toast -->
    <SToast ref="toastRef" />

    <!-- 档案选择弹层 -->
    <view v-if="showBookSheet" class="sheet-mask" @tap="showBookSheet = false">
      <view class="sheet" catchMove @tap.stop>
        <view class="sheet__header">
          <text class="sheet__title">选择档案</text>
          <view class="sheet__close" @tap="showBookSheet = false">
            <text class="sheet__close-icon">×</text>
          </view>
        </view>
        
        <view class="sheet__content">
          <!-- 档案列表 -->
          <view class="book-list">
            <view 
              v-for="book in allBooks" 
              :key="book.bookId" 
              class="book-item"
              :class="{ 'book-item--active': book.bookId === currentBookId }"
              @tap="onSelectBook(book.bookId)"
            >
              <view class="book-item__avatar">
                <image 
                  v-if="book.petAvatar" 
                  :src="book.petAvatar" 
                  class="book-item__avatar-img book-item__avatar-img--real" 
                  mode="aspectFill" 
                />
                <image 
                  v-else 
                  src="/static/icons/paw-print.svg" 
                  class="book-item__avatar-img book-item__avatar-img--placeholder" 
                  mode="aspectFit" 
                />
              </view>
              <view class="book-item__info">
                <text class="book-item__name">{{ book.petName || book.name }}</text>
                <text v-if="!book.isOwner" class="book-item__owner">来自 {{ book.ownerNickname }}</text>
              </view>
              <view v-if="book.bookId === currentBookId" class="book-item__check">
                <text class="book-item__check-icon">✓</text>
              </view>
            </view>
          </view>

          <!-- 新建档案按钮 -->
          <view class="sheet__actions">
            <button class="btn btn--ghost" @tap="createNewBook">
              新建档案
            </button>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import Taro from '@tarojs/taro'
import { ref, computed } from 'vue'
import { usePet } from '@/composables/usePet'
import { useRecords } from '@/composables/useRecords'
import { useAuth } from '@/composables/useAuth'
import SToast from '@/components/SToast.vue'

// 默认宠物图标
const DEFAULT_PET_ICON = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 24 24' fill='none' stroke='%239E9E9E' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='11' cy='4' r='2'/%3E%3Ccircle cx='18' cy='8' r='2'/%3E%3Ccircle cx='20' cy='16' r='2'/%3E%3Cpath d='M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z'/%3E%3C/svg%3E`

const { pet, savePet, uploadAvatar, uploadOwnerAvatar, updateOwnerName, removeOwner, clearPet, loadPet } = usePet()
const { clearRecords, loadRecords } = useRecords()
const { currentBookId, currentBook, allBooks, logout, shareBook, selectBook, createBook, joinBook } = useAuth()
const toastRef = ref<InstanceType<typeof SToast> | null>(null)

const bookInfo = computed(() => currentBook.value || { name: '我的档案', isOwner: true })
const owners = computed(() => pet.value.owners || [])

// 档案选择弹层
const showBookSheet = ref(false)

// 分享码
const shareCode = ref('')
const shareCodeLoading = ref(false)

async function copyShareCode() {
  // 如果已有分享码，直接复制
  if (shareCode.value) {
    Taro.setClipboardData({
      data: shareCode.value,
      success: () => {
        toastRef.value?.show('已复制分享码', 'success')
      }
    })
    return
  }

  // 生成分享码
  const bookId = currentBookId.value
  if (!bookId) {
    toastRef.value?.show('档案不存在', 'error')
    return
  }

  shareCodeLoading.value = true

  try {
    const result = await shareBook(bookId)
    if (result) {
      shareCode.value = result.shareCode
      // 自动复制
      Taro.setClipboardData({
        data: result.shareCode,
        success: () => {
          toastRef.value?.show('已复制分享码', 'success')
        }
      })
    }
  } catch (err) {
    toastRef.value?.show('生成失败', 'error')
  } finally {
    shareCodeLoading.value = false
  }
}

function changeAvatar() {
  uploadAvatar().then(() => {
    toastRef.value?.show('头像已更新', 'success')
  }).catch((err) => {
    // 用户取消选择不提示错误
    if (err?.errMsg?.includes('cancel')) return
    toastRef.value?.show('上传失败', 'error')
  })
}

// === 主人操作 ===
function onOwnerTap(index: number) {
  const owner = owners.value[index]
  Taro.showActionSheet({
    itemList: ['更换头像', '修改名字', '移除主人'],
    success: (res) => {
      if (res.tapIndex === 0) {
        // 更换头像
        uploadOwnerAvatar(index).then(() => {
          toastRef.value?.show('头像已更新', 'success')
        }).catch((err) => {
          if (err?.errMsg?.includes('cancel')) return
          toastRef.value?.show('上传失败', 'error')
        })
      } else if (res.tapIndex === 1) {
        // 修改名字
        Taro.showModal({
          title: '修改主人名字',
          editable: true,
          placeholderText: '请输入名字',
          content: owner?.name || '',
          success: (modalRes) => {
            if (modalRes.confirm && modalRes.content !== undefined) {
              updateOwnerName(index, modalRes.content)
              toastRef.value?.show('已更新', 'success')
            }
          }
        })
      } else if (res.tapIndex === 2) {
        // 移除主人
        Taro.showModal({
          title: '移除主人',
          content: '确定要移除这个主人吗？',
          success: (modalRes) => {
            if (modalRes.confirm) {
              removeOwner(index)
              toastRef.value?.show('已移除', 'success')
            }
          }
        })
      }
    },
    fail: () => {
      // 用户取消
    }
  })
}

function addOwner(index: number) {
  uploadOwnerAvatar(index).then(() => {
    toastRef.value?.show('主人已添加', 'success')
  }).catch((err) => {
    if (err?.errMsg?.includes('cancel')) return
    toastRef.value?.show('上传失败', 'error')
  })
}

function editField(field: string) {
  const fieldLabels: Record<string, string> = {
    name: '名字',
    breed: '品种',
    birthday: '生日'
  }
  const label = fieldLabels[field]
  const currentValue = (pet.value as any)[field] || ''

  Taro.showModal({
    title: `编辑${label}`,
    editable: true,
    placeholderText: `请输入${label}`,
    content: currentValue,
    success: (res) => {
      if (res.confirm && res.content !== undefined) {
        savePet({ [field]: res.content })
        toastRef.value?.show('已更新', 'success')
      }
    }
  })
}

function showAbout() {
  Taro.showModal({
    title: '关于毛坨日记',
    content: '毛坨日记 - AI 智能宠物生活管家 v1.0.0',
    showCancel: false
  })
}

// === 档案管理 ===
function switchBook() {
  // 如果只有一个档案（当前档案），直接新建空白档案
  if (allBooks.value.length <= 1) {
    createNewBook()
  } else {
    // 有多个档案，显示选择弹层
    showBookSheet.value = true
  }
}

async function onSelectBook(bookId: string) {
  if (bookId === currentBookId.value) {
    showBookSheet.value = false
    return
  }

  Taro.showLoading({ title: '切换中...' })

  try {
    await selectBook(bookId)
    // 重新加载数据
    await Promise.all([loadPet(), loadRecords()])
    
    Taro.hideLoading()
    showBookSheet.value = false
    toastRef.value?.show('已切换档案', 'success')
    
    // 返回首页
    setTimeout(() => {
      Taro.reLaunch({ url: '/pages/vault/index' })
    }, 500)
  } catch (err) {
    Taro.hideLoading()
    toastRef.value?.show('切换失败', 'error')
  }
}

function createNewBook() {
  Taro.showModal({
    title: '新建档案',
    editable: true,
    placeholderText: '请输入档案名称',
    content: '',
    success: async (res) => {
      if (res.confirm && res.content?.trim()) {
        Taro.showLoading({ title: '创建中...' })
        
        try {
          const book = await createBook(res.content.trim())
          if (book) {
            // 切换到新档案
            await selectBook(book.bookId)
            await Promise.all([loadPet(), loadRecords()])
            
            Taro.hideLoading()
            showBookSheet.value = false
            toastRef.value?.show('创建成功', 'success')
            
            // 返回首页
            setTimeout(() => {
              Taro.reLaunch({ url: '/pages/vault/index' })
            }, 500)
          } else {
            Taro.hideLoading()
            toastRef.value?.show('创建失败', 'error')
          }
        } catch (err) {
          Taro.hideLoading()
          toastRef.value?.show('创建失败', 'error')
        }
      }
    }
  })
}

function handleJoinBook() {
  Taro.showModal({
    title: '加入档案',
    editable: true,
    placeholderText: '请输入6位分享码',
    content: '',
    success: async (res) => {
      if (res.confirm && res.content?.trim()) {
        const code = res.content.trim().toUpperCase()
        
        if (code.length !== 6) {
          toastRef.value?.show('分享码为6位字符', 'error')
          return
        }
        
        Taro.showLoading({ title: '加入中...' })
        
        try {
          const result = await joinBook(code)
          if (result) {
            // 切换到新加入的档案
            await selectBook(result.bookId)
            await Promise.all([loadPet(), loadRecords()])
            
            Taro.hideLoading()
            toastRef.value?.show('加入成功', 'success')
            
            // 返回首页
            setTimeout(() => {
              Taro.reLaunch({ url: '/pages/vault/index' })
            }, 500)
          } else {
            Taro.hideLoading()
          }
        } catch (err) {
          Taro.hideLoading()
        }
      }
    }
  })
}

function handleLogout() {
  Taro.showModal({
    title: '退出登录',
    content: '确认退出当前档案？',
    success: (res) => {
      if (res.confirm) {
        clearRecords()
        clearPet()
        logout()
        Taro.reLaunch({ url: '/pages/launch/index' })
      }
    }
  })
}
</script>

<style lang="scss">
@import '../../styles/variables.scss';

.page {
  min-height: 100vh;
  background-color: $background;
  padding-bottom: calc(160rpx + env(safe-area-inset-bottom));
}

.profile-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: $space-8 $space-4 $space-6;
  gap: $space-2;

  &__avatar-group {
    position: relative;
    width: 200rpx;
    height: 200rpx;
  }

  &__avatar {
    width: 200rpx;
    height: 200rpx;
    border-radius: $radius-full;
    background-color: $muted;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 6rpx solid $card;
    box-shadow: 0 4rpx 24rpx rgba(0, 0, 0, 0.08);
    overflow: hidden;
    position: relative;
    z-index: 1;
  }

  &__avatar-img {
    width: 100%;
    height: 100%;
  }

  &__owner {
    position: absolute;
    z-index: 3;

    &--first {
      bottom: -8rpx;
      right: -44rpx;
    }

    &--second {
      bottom: 18rpx;
      left: -52rpx;
    }
  }

  &__owner-img {
    width: 86rpx;
    height: 86rpx;
    border-radius: $radius-full;
    border: 5rpx solid $card;
    box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.1);
  }

  &__owner-placeholder {
    width: 86rpx;
    height: 86rpx;
    border-radius: $radius-full;
    border: 5rpx solid $card;
    box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.1);
    background-color: $muted;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__owner-icon {
    font-size: 44rpx;
    color: $muted-foreground;
    font-weight: 300;
  }

  &__name {
    font-size: $text-xl;
    font-weight: $font-semibold;
    color: $foreground;
  }
}

.section {
  padding: 0 $space-4;
  margin-bottom: $space-5;

  &__label {
    font-size: $text-sm;
    font-weight: $font-medium;
    color: $muted-foreground;
    margin-bottom: $space-2;
    padding-left: $space-1;
    display: block;
  }

  &__hint {
    font-size: $text-xs;
    color: $muted-foreground;
    margin-top: $space-2;
    padding-left: $space-1;
    opacity: 0.8;
  }
}

.info-card {
  background-color: $card;
  border-radius: $radius;
  overflow: hidden;
  box-shadow:
    0 0 0 2rpx rgba(0, 0, 0, 0.04),
    0 4rpx 16rpx rgba(0, 0, 0, 0.05),
    0 8rpx 32rpx rgba(0, 0, 0, 0.03);
}

.info-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $space-4;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);

  &:last-child { border-bottom: none; }

  &--danger {
    // 危险样式
  }

  &__label {
    font-size: $text-base;
    color: $foreground;
  }

  &__right {
    display: flex;
    align-items: center;
    gap: $space-2;
  }

  &__value {
    font-size: $text-base;
    color: $muted-foreground;

    &--small {
      font-size: $text-sm;
      font-family: monospace;
      background-color: #F5F5F4;
      padding: 4rpx 16rpx;
      border-radius: 12rpx;
    }

    &--code {
      font-size: $text-base;
      font-family: monospace;
      color: $primary;
      font-weight: $font-medium;
      letter-spacing: 2rpx;
    }
  }

  &__chevron {
    font-size: $text-xl;
    color: $muted-foreground;
  }
}

.version {
  display: block;
  text-align: center;
  font-size: $text-sm;
  color: $muted-foreground;
  padding: $space-6 0;
  opacity: 0.6;
}

// === 档案选择弹层 ===
.sheet-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
}

.sheet {
  width: 100%;
  background-color: $card;
  border-radius: $radius-lg $radius-lg 0 0;
  max-height: 80vh;
  display: flex;
  flex-direction: column;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: $space-4 $space-5;
    border-bottom: 1px solid rgba(0, 0, 0, 0.04);
  }

  &__title {
    font-size: $text-lg;
    font-weight: $font-semibold;
    color: $foreground;
  }

  &__close {
    width: 56rpx;
    height: 56rpx;
    border-radius: $radius-full;
    background-color: $muted;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__close-icon {
    font-size: 40rpx;
    color: $muted-foreground;
    line-height: 1;
  }

  &__content {
    flex: 1;
    overflow-y: auto;
    padding: $space-4;
  }

  &__actions {
    padding: $space-4 0;
    padding-bottom: calc($space-4 + env(safe-area-inset-bottom));
  }
}

.book-list {
  display: flex;
  flex-direction: column;
  gap: $space-3;
}

.book-item {
  display: flex;
  align-items: center;
  padding: $space-4;
  background-color: $background;
  border-radius: $radius;
  gap: $space-3;
  transition: all 0.2s ease;
  box-shadow:
    0 0 0 2rpx rgba(0, 0, 0, 0.04),
    0 2rpx 8rpx rgba(0, 0, 0, 0.03);

  &--active {
    box-shadow:
      0 0 0 4rpx $primary,
      0 4rpx 16rpx rgba(28, 25, 23, 0.08);
    background-color: rgba(28, 25, 23, 0.02);
  }

  &:active {
    transform: scale(0.98);
  }

  &__avatar {
    width: 88rpx;
    height: 88rpx;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    overflow: hidden;
    background: linear-gradient(135deg, #FFE4E4 0%, #FFF0F0 100%);
  }

  &__avatar-img {
    &--real {
      width: 100%;
      height: 100%;
      border-radius: 50%;
    }

    &--placeholder {
      width: 48rpx;
      height: 48rpx;
      opacity: 0.7;
    }
  }

  &__info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4rpx;
  }

  &__name {
    font-size: $text-base;
    font-weight: $font-medium;
    color: $foreground;
  }

  &__owner {
    font-size: $text-xs;
    color: $muted-foreground;
  }

  &__check {
    width: 48rpx;
    height: 48rpx;
    border-radius: $radius-full;
    background-color: $primary;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__check-icon {
    font-size: 28rpx;
    color: white;
    font-weight: bold;
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
  width: 100%;
  transition: all 0.2s ease;

  &--ghost {
    background-color: transparent;
    border: 4rpx dashed $border;
    color: $foreground;

    &:active {
      background-color: $muted;
    }
  }
}
</style>
