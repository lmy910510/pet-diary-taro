<template>
  <page-meta 
    :page-style="showSheet || showDetail ? 'overflow: hidden; height: 100vh; position: fixed; width: 100%;' : ''" 
  />
  <view :class="['page', (showSheet || showDetail) ? 'page--locked' : '']">
    <!-- 顶部导航栏 -->
    <view class="nav-bar">
      <!-- 左侧：宠物头像 -> 个人中心 -->
      <view class="nav-bar__left" @tap="onProfileClick">
        <view class="pet-avatar">
          <image 
            v-if="pet.avatar" 
            :src="pet.avatar" 
            class="pet-avatar__img" 
            mode="aspectFill"
          />
          <view v-else class="pet-avatar__placeholder">
            {{ pet.name?.charAt(0) || '宠' }}
          </view>
        </view>
      </view>
      
      <!-- 中间：标题 -->
      <text class="nav-bar__title">{{ pet.name ? `${pet.name}的档案` : '档案' }}</text>
      
      <!-- 右侧：日历模式 -->
      <view class="nav-bar__right">
        <view class="nav-bar__icon-btn" @tap="onCalendarClick">
          <image src="/static/icons/calendar.svg" class="nav-bar__icon" mode="aspectFit" />
        </view>
      </view>
    </view>

    <!-- 内容区域 -->
    <view class="content">
      <!-- 加载状态 -->
      <view v-if="isLoading" class="loading-state">
        <view class="loading-state__spinner">
          <view class="loading-state__dot" />
          <view class="loading-state__dot" />
          <view class="loading-state__dot" />
        </view>
        <text class="loading-state__text">正在加载数据...</text>
      </view>

      <template v-else>
        <!-- 金刚区分类 -->
        <view class="vault-grid">
          <view
            v-for="cat in categories"
            :key="cat.type"
            class="vault-grid__item"
            :class="{ 'vault-grid__item--active': activeFilter === cat.type }"
            @tap="onCategoryTap(cat.type)"
          >
            <view class="vault-grid__icon">
              <RecordTypeIcon :type="cat.type" :size="120" />
            </view>
            <text class="vault-grid__label">{{ cat.label }}</text>
            <text class="vault-grid__count">{{ getCount(cat.type) }}</text>
          </view>
        </view>

        <!-- 时间轴记录 -->
        <view v-if="filteredRecords.length > 0" class="timeline">
          <view v-for="(group, gIdx) in groupedRecords" :key="gIdx" class="timeline__group">
            <text class="timeline__date-label">{{ group.label }}</text>
            <view class="timeline__items">
              <view
                v-for="(record, idx) in group.records"
                :key="record._id"
                class="timeline__item"
                :style="{ animationDelay: `${idx * 60}ms` }"
              >
                <SwipeCell @delete="onSwipeDelete(record)">
                  <RecordCard :record="record" @tap="onRecordTap(record)" />
                </SwipeCell>
              </view>
            </view>
          </view>
        </view>

        <!-- 空状态 -->
        <SEmpty
          v-else-if="records.length === 0"
          title="还没有记录"
          description="拍张照片，让 AI 帮你记录宠物的每一天"
          actionText="开始识别"
          @action="onCameraClick"
        />

        <!-- 筛选空状态 -->
        <SEmpty
          v-else
          title="没有此类记录"
          description="当前分类暂无记录"
          actionText="清除筛选"
          @action="activeFilter = null"
        />
      </template>
    </view>

    <!-- 底部快捷操作栏 -->
    <view class="bottom-bar">
      <view class="bottom-bar__btn bottom-bar__btn--add" @tap="onCameraClick">
        <image src="/static/icons/sparkles.svg" class="bottom-bar__btn-icon" mode="aspectFit" />
        <text class="bottom-bar__btn-text">添加记录</text>
      </view>
    </view>

    <!-- AI 识别弹窗 -->
    <AiRecognizeSheet
      :visible="showSheet"
      :initial-mode="sheetMode"
      @update:visible="showSheet = $event"
      @confirm="onConfirm"
      @confirm-batch="onConfirmBatch"
    />

    <!-- Toast -->
    <SToast ref="toastRef" />

    <!-- 记录详情弹窗 -->
    <RecordDetailSheet
      v-if="detailRecord"
      :visible="showDetail"
      :record="detailRecord"
      @update:visible="showDetail = $event"
      @delete="onDeleteRecord"
      @edit="onEditRecord"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import Taro from '@tarojs/taro'
import type { PetRecord, RecordType } from '@/types/index'
import { RECORD_TYPE_MAP } from '@/types/index'
import { useRecords } from '@/composables/useRecords'
import { usePet } from '@/composables/usePet'
import { useAuth } from '@/composables/useAuth'
import RecordCard from '@/components/RecordCard.vue'
import RecordTypeIcon from '@/components/icons/RecordTypeIcon.vue'
import SwipeCell from '@/components/SwipeCell.vue'
import SEmpty from '@/components/SEmpty.vue'
import SToast from '@/components/SToast.vue'
import AiRecognizeSheet from '@/components/AiRecognizeSheet.vue'
import RecordDetailSheet from '@/components/RecordDetailSheet.vue'

console.log('[Vault] 页面组件加载')

const { records, recordsLoading, addRecord, deleteRecord, updateRecord, loadRecords } = useRecords()
const { pet, petLoading, loadPet } = usePet()
const { isLoggedIn, currentBookId, silentLogin, allBooks, selectBook: authSelectBook } = useAuth()

const isInitializing = ref(true)
const needLogin = ref(false)

onMounted(async () => {
  console.log('[Vault] onMounted 执行')
  
  try {
    // 首先尝试静默登录（从缓存恢复或调用登录）
    console.log('[Vault] 开始静默登录...')
    const loginSuccess = await silentLogin()
    
    console.log('[Vault] silentLogin 结果:', loginSuccess)
    console.log('[Vault] isLoggedIn:', isLoggedIn.value)
    console.log('[Vault] allBooks:', allBooks.value.length)
    console.log('[Vault] currentBookId:', currentBookId.value)
    
    // 检查登录状态和档案
    if (!loginSuccess || !isLoggedIn.value || allBooks.value.length === 0) {
      console.log('[Vault] 未登录或无档案，设置需要登录标志')
      needLogin.value = true
      isInitializing.value = false
      // 延迟跳转，避免页面闪烁
      setTimeout(() => {
        Taro.reLaunch({ url: '/pages/launch/index' })
      }, 100)
      return
    }
    
    // 如果没有选择档案，自动选择第一个
    if (!currentBookId.value && allBooks.value.length > 0) {
      console.log('[Vault] 自动选择第一个档案:', allBooks.value[0].bookId)
      await authSelectBook(allBooks.value[0].bookId)
    }
    
    console.log('[Vault] 开始加载数据...')
    
    // 加载宠物信息和记录
    await Promise.all([loadPet(), loadRecords()])
    
    isInitializing.value = false
    
    console.log('[Vault] 数据加载完成')
    console.log('[Vault] records:', records.value.length)
    console.log('[Vault] pet:', pet.value.name)
  } catch (err) {
    console.error('[Vault] 初始化出错:', err)
    isInitializing.value = false
  }
})

// 合并加载状态
const isLoading = computed(() => isInitializing.value || recordsLoading.value || petLoading.value)
const showSheet = ref(false)
const sheetMode = ref<'camera' | 'album' | 'none'>('none')
const showDetail = ref(false)
const detailRecord = ref<PetRecord | null>(null)
const toastRef = ref<InstanceType<typeof SToast> | null>(null)
const activeFilter = ref<RecordType | null>(null)

// 点击头像 -> 个人中心
function onProfileClick() {
  Taro.navigateTo({
    url: '/pages/profile/index'
  })
}

// 点击日历 -> 日历视图
function onCalendarClick() {
  Taro.navigateTo({
    url: '/pages/calendar/index'
  })
}

// 底部操作栏 - 打开完整的添加记录面板
function onCameraClick() {
  sheetMode.value = 'none'
  showSheet.value = true
}

const today = new Date()

const categories = computed(() => [
  { ...RECORD_TYPE_MAP.medical, type: 'medical' as RecordType },
  { ...RECORD_TYPE_MAP.diet, type: 'diet' as RecordType },
  { ...RECORD_TYPE_MAP.growth, type: 'growth' as RecordType },
  { ...RECORD_TYPE_MAP.grooming, type: 'grooming' as RecordType }
])

function getCount(type: RecordType): number {
  return records.value.filter(r => r.type === type).length
}

const filteredRecords = computed(() => {
  if (!activeFilter.value) return records.value
  return records.value.filter(r => r.type === activeFilter.value)
})

interface RecordGroup {
  label: string
  records: PetRecord[]
}

const groupedRecords = computed<RecordGroup[]>(() => {
  const groups: Record<string, PetRecord[]> = {}
  filteredRecords.value.forEach(r => {
    const key = r.eventDate
    if (!groups[key]) groups[key] = []
    groups[key].push(r)
  })

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  return Object.keys(groups)
    .sort((a, b) => b.localeCompare(a))
    .map(date => ({
      label: date === todayStr ? '今天' : formatDateLabel(date),
      records: groups[date]
    }))
})

function formatDateLabel(dateStr: string): string {
  const parts = dateStr.split('-')
  return `${parseInt(parts[1])}月${parseInt(parts[2])}日`
}

function onCategoryTap(type: RecordType) {
  activeFilter.value = activeFilter.value === type ? null : type
}

function onRecordTap(record: PetRecord) {
  detailRecord.value = record
  showDetail.value = true
}

async function onSwipeDelete(record: PetRecord) {
  // 弹出确认对话框
  Taro.showModal({
    title: '确认删除',
    content: `确定要删除「${record.title}」吗？`,
    confirmText: '删除',
    confirmColor: '#EF4444',
    success: async (res) => {
      if (res.confirm && record._id) {
        await deleteRecord(record._id)
        toastRef.value?.show('已删除', 'success')
      }
    }
  })
}

async function onDeleteRecord(record: PetRecord) {
  if (!record._id) return
  await deleteRecord(record._id)
  showDetail.value = false
  detailRecord.value = null
  toastRef.value?.show('已删除', 'success')
}

async function onEditRecord(record: PetRecord, data: Partial<PetRecord>) {
  if (!record._id) return
  await updateRecord(record._id, data)
  toastRef.value?.show('已保存', 'success')
}

/**
 * 将临时图片上传到云存储，返回持久化的 fileID
 * 临时路径在小程序重启后会失效，必须上传到云存储才能持久访问
 */
async function uploadImageToCloud(tempPath: string): Promise<string> {
  if (!tempPath) return ''
  // 如果已经是云存储 fileID，直接返回
  if (tempPath.startsWith('cloud://')) return tempPath
  
  try {
    const { getBookId } = useAuth()
    const bookId = getBookId()
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    const ext = tempPath.split('.').pop()?.toLowerCase() || 'jpg'
    const cloudPath = `records/${bookId}/${timestamp}-${random}.${ext}`
    
    const uploadRes = await Taro.cloud.uploadFile({
      cloudPath,
      filePath: tempPath
    })
    console.log('[Vault] 图片上传云存储成功:', uploadRes.fileID)
    return uploadRes.fileID
  } catch (err) {
    console.warn('[Vault] 图片上传云存储失败，使用原路径:', err)
    return tempPath
  }
}

async function onConfirm(data: { title: string; content: string; eventDate: string; type: string; imageUrl: string; aiRawData?: Record<string, unknown> }) {
  // 先将临时图片上传到云存储
  const imageUrl = await uploadImageToCloud(data.imageUrl)
  
  const result = await addRecord({
    petId: pet.value._id || '',
    type: data.type as RecordType,
    title: data.title,
    content: data.content,
    eventDate: data.eventDate,
    imageUrl,
    aiRawData: data.aiRawData,
    status: 'confirmed'
  })
  if (result) {
    toastRef.value?.show('已保存', 'success')
  } else {
    toastRef.value?.show('保存失败', 'error')
  }
}

async function onConfirmBatch(data: Array<{ title: string; content: string; eventDate: string; type: string; imageUrl: string }>) {
  let successCount = 0
  let failCount = 0
  
  for (const item of data) {
    // 逐张上传图片到云存储
    const imageUrl = await uploadImageToCloud(item.imageUrl)
    
    const result = await addRecord({
      petId: pet.value._id || '',
      type: item.type as RecordType,
      title: item.title,
      content: item.content,
      eventDate: item.eventDate,
      imageUrl,
      status: 'confirmed'
    })
    if (result) {
      successCount++
    } else {
      failCount++
    }
  }
  
  if (failCount === 0) {
    toastRef.value?.show(`已保存 ${successCount} 条记录`, 'success')
  } else {
    toastRef.value?.show(`保存成功 ${successCount} 条，失败 ${failCount} 条`, 'info')
  }
}
</script>

<style lang="scss">
.page {
  min-height: 100vh;
  background-color: #FAFAF9;

  &--locked {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100vh;
    overflow: hidden;
  }
}

/* ============================
 * 导航栏 — 毛玻璃效果
 * ============================ */
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 36rpx;
  padding-top: calc(28rpx + env(safe-area-inset-top));
  background-color: rgba(250, 250, 249, 0.88);
  backdrop-filter: blur(40rpx) saturate(180%);
  -webkit-backdrop-filter: blur(40rpx) saturate(180%);
  position: sticky;
  top: 0;
  z-index: 100;
  border-bottom: 1rpx solid rgba(231, 229, 228, 0.4);

  &__left {
    width: 80rpx;
  }

  &__title {
    font-size: 38rpx;
    font-weight: 700;
    color: #1C1917;
    letter-spacing: -0.5rpx;
  }

  &__right {
    width: 80rpx;
    display: flex;
    justify-content: flex-end;
  }

  &__icon-btn {
    width: 76rpx;
    height: 76rpx;
    border-radius: 38rpx;
    background-color: #FFFFFF;
    border: 2rpx solid #E7E5E4;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.03);

    &:active {
      transform: scale(0.92);
      background-color: #F5F5F4;
    }
  }

  &__icon {
    width: 36rpx;
    height: 36rpx;
  }
}

/* ============================
 * 宠物头像
 * ============================ */
.pet-avatar {
  width: 76rpx;
  height: 76rpx;
  border-radius: 38rpx;
  background-color: #FFFFFF;
  border: 2rpx solid #E7E5E4;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.03);

  &:active {
    transform: scale(0.92);
  }

  &__img {
    width: 100%;
    height: 100%;
  }

  &__placeholder {
    font-size: 28rpx;
    font-weight: 600;
    color: #78716C;
  }
}

/* ============================
 * 加载状态
 * ============================ */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 256rpx 64rpx;
  gap: 32rpx;

  &__spinner {
    display: flex;
    gap: 16rpx;
  }

  &__dot {
    width: 16rpx;
    height: 16rpx;
    border-radius: 50%;
    background-color: #1C1917;
    animation: bounce 1.4s infinite ease-in-out both;

    &:nth-child(1) {
      animation-delay: -0.32s;
    }
    &:nth-child(2) {
      animation-delay: -0.16s;
    }
    &:nth-child(3) {
      animation-delay: 0s;
    }
  }

  &__text {
    font-size: 26rpx;
    color: #A8A29E;
    font-weight: 500;
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

/* ============================
 * 内容区
 * ============================ */
.content {
  padding-bottom: 220rpx;
}

/* ============================
 * 金刚区分类 — 激活态反转、阴影层次
 * ============================ */
.vault-grid {
  display: flex;
  justify-content: space-between;
  gap: 16rpx;
  padding: 24rpx 32rpx;

  &__item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16rpx;
    padding: 20rpx 16rpx;
    border-radius: 36rpx;
    background: linear-gradient(180deg, #FFFFFF 0%, #FAFAF9 100%);
    border: 2rpx solid #E7E5E4;
    transition: background 0.3s ease, box-shadow 0.3s ease, transform 0.15s ease;
    min-width: 0;
    box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.02);

    &:active {
      transform: scale(0.96);
    }

    &--active {
      border: 4rpx solid #1C1917;
      background: #FFFFFF;
      box-shadow: 0 4rpx 16rpx rgba(28, 25, 23, 0.08);
    }
  }

  /* 嵌套圆角：父 36rpx - padding 20rpx = 图标 16rpx */
  &__icon {
    width: 120rpx;
    height: 120rpx;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__label {
    font-size: 26rpx;
    font-weight: 600;
    color: #1C1917;
    white-space: nowrap;
    transition: color 0.3s ease;
  }

  &__count {
    font-size: 36rpx;
    font-weight: 700;
    color: #1C1917;
    font-variant-numeric: tabular-nums;
    transition: color 0.3s ease;
  }
}

/* ============================
 * 时间轴 — 入场动画
 * ============================ */
.timeline {
  padding: 32rpx;

  &__group {
    margin-bottom: 48rpx;
  }

  &__date-label {
    font-size: 24rpx;
    font-weight: 600;
    color: #A8A29E;
    margin-bottom: 24rpx;
    display: block;
    text-transform: uppercase;
    letter-spacing: 1rpx;
  }

  &__items {
    display: flex;
    flex-direction: column;
    gap: 20rpx;
  }

  &__item {
    animation: card-slide-in 0.45s cubic-bezier(0.4, 0, 0.2, 1) both;
  }
}

@keyframes card-slide-in {
  from {
    opacity: 0;
    transform: translateY(24rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ============================
 * 底部操作栏 — 渐变 + 阴影 + 按压
 * ============================ */
.bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    180deg,
    rgba(250, 250, 249, 0) 0%,
    rgba(250, 250, 249, 0.75) 25%,
    rgba(250, 250, 249, 1) 50%
  );
  padding: 40rpx 32rpx calc(40rpx + env(safe-area-inset-bottom));
  display: flex;
  justify-content: center;

  &__btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 20rpx;
    padding: 32rpx 72rpx;
    border-radius: 52rpx;
    font-weight: 600;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

    &:active {
      transform: scale(0.95);
      box-shadow: 0 4rpx 12rpx rgba(28, 25, 23, 0.15);
    }

    &--add {
      background: linear-gradient(135deg, #292524 0%, #0C0A09 100%);
      color: white;
      box-shadow:
        0 8rpx 24rpx rgba(28, 25, 23, 0.25),
        0 2rpx 8rpx rgba(28, 25, 23, 0.12);
    }
  }

  &__btn-icon {
    width: 44rpx;
    height: 44rpx;
    filter: brightness(0) invert(1);
  }

  &__btn-text {
    font-size: 32rpx;
    letter-spacing: 1rpx;
  }
}
</style>
