import Taro from '@tarojs/taro'
import { ref, readonly, computed } from 'vue'

// ============= 类型定义 =============
export interface UserBook {
  bookId: string
  name: string
  createdAt?: string | Date
  isOwner?: boolean
  ownerNickname?: string
  petAvatar?: string  // 宠物头像
  petName?: string    // 宠物名称
}

export interface UserInfo {
  _id: string
  _openid: string
  nickname: string
  avatarUrl: string
  ownedBooks: UserBook[]
  sharedBooks: UserBook[]
  createdAt: string | Date
  lastLoginAt: string | Date
  isNew?: boolean
}

export interface ShareCodeResult {
  shareCode: string
  expireAt: string
  bookName: string
}

export interface JoinBookResult {
  bookId: string
  bookName: string
  ownerNickname: string
}

// ============= 常量 =============
const CURRENT_BOOK_KEY = 'pet-secretary-current-book'
const USER_CACHE_KEY = 'pet-secretary-user-cache'

// ============= 状态 =============
const currentUser = ref<UserInfo | null>(null)
const currentBookId = ref<string>('')
const isLoggedIn = ref(false)
const isAuthReady = ref(false)
const authLoading = ref(false)
const isCloudReady = ref(false)

// ============= 计算属性 =============
// 当前档案信息
const currentBook = computed(() => {
  if (!currentUser.value || !currentBookId.value) return null
  
  const owned = currentUser.value.ownedBooks?.find(b => b.bookId === currentBookId.value)
  if (owned) return { ...owned, isOwner: true }
  
  const shared = currentUser.value.sharedBooks?.find(b => b.bookId === currentBookId.value)
  if (shared) return { ...shared, isOwner: false }
  
  return null
})

// 所有可访问的档案
const allBooks = computed(() => {
  if (!currentUser.value) return []
  
  const owned = (currentUser.value.ownedBooks || []).map(b => ({ ...b, isOwner: true }))
  const shared = (currentUser.value.sharedBooks || []).map(b => ({ ...b, isOwner: false }))
  
  return [...owned, ...shared]
})

// ============= 云开发初始化 =============
async function initCloud(): Promise<boolean> {
  if (isCloudReady.value) return true
  
  try {
    if (Taro.cloud) {
      await Taro.cloud.init({
        env: 'cloud1-8gx48cqj9601392a',
        traceUser: true
      })
      isCloudReady.value = true
      console.log('[Auth] 云开发初始化成功')
      return true
    }
    return false
  } catch (err) {
    console.error('[Auth] 云开发初始化失败:', err)
    return false
  }
}

// ============= 核心认证方法 =============

/**
 * 微信登录
 * 自动获取 openid，创建或获取用户信息
 */
async function login(): Promise<UserInfo | null> {
  if (authLoading.value) return null
  
  authLoading.value = true
  
  try {
    await initCloud()
    
    // 调用云函数进行登录
    const res = await Taro.cloud.callFunction({
      name: 'userAuth',
      data: { action: 'login' }
    }) as { result: { success: boolean; data?: UserInfo; error?: string } }
    
    if (res.result?.success && res.result.data) {
      const user = res.result.data
      currentUser.value = user
      isLoggedIn.value = true
      
      // 缓存用户信息
      Taro.setStorageSync(USER_CACHE_KEY, JSON.stringify(user))
      
      // 自动选择第一个档案
      const firstBook = user.ownedBooks?.[0] || user.sharedBooks?.[0]
      if (firstBook && !currentBookId.value) {
        await selectBook(firstBook.bookId)
      }
      
      console.log('[Auth] 登录成功:', user.isNew ? '新用户' : '老用户')
      return user
    } else {
      console.error('[Auth] 登录失败:', res.result?.error)
      return null
    }
  } catch (err) {
    console.error('[Auth] 登录异常:', err)
    return null
  } finally {
    authLoading.value = false
    isAuthReady.value = true
  }
}

/**
 * 静默登录（使用缓存 + 后台刷新）
 */
async function silentLogin(): Promise<boolean> {
  // 先尝试从缓存恢复
  try {
    const cached = Taro.getStorageSync(USER_CACHE_KEY)
    if (cached) {
      const user = JSON.parse(cached) as UserInfo
      currentUser.value = user
      isLoggedIn.value = true
      
      // 恢复上次选择的档案
      const savedBookId = Taro.getStorageSync(CURRENT_BOOK_KEY)
      if (savedBookId) {
        currentBookId.value = savedBookId
      } else if (user.ownedBooks?.[0]) {
        currentBookId.value = user.ownedBooks[0].bookId
      }
      
      isAuthReady.value = true
      
      // 后台刷新用户信息
      refreshUserInfo()
      
      return true
    }
  } catch (err) {
    console.warn('[Auth] 缓存恢复失败:', err)
  }
  
  // 缓存不存在，执行正式登录
  const user = await login()
  return !!user
}

/**
 * 后台刷新用户信息
 */
async function refreshUserInfo(): Promise<void> {
  try {
    await initCloud()
    
    const res = await Taro.cloud.callFunction({
      name: 'userAuth',
      data: { action: 'getUserInfo' }
    }) as { result: { success: boolean; data?: UserInfo } }
    
    if (res.result?.success && res.result.data) {
      currentUser.value = res.result.data
      Taro.setStorageSync(USER_CACHE_KEY, JSON.stringify(res.result.data))
    }
  } catch (err) {
    console.warn('[Auth] 刷新用户信息失败:', err)
  }
}

/**
 * 退出登录
 */
function logout(): void {
  currentUser.value = null
  currentBookId.value = ''
  isLoggedIn.value = false
  
  Taro.removeStorageSync(USER_CACHE_KEY)
  Taro.removeStorageSync(CURRENT_BOOK_KEY)
}

// ============= 档案管理方法 =============

/**
 * 选择当前档案
 */
async function selectBook(bookId: string): Promise<boolean> {
  if (!currentUser.value) return false
  
  // 验证档案是否可访问
  const allAccessible = [
    ...(currentUser.value.ownedBooks || []),
    ...(currentUser.value.sharedBooks || [])
  ]
  
  const book = allAccessible.find(b => b.bookId === bookId)
  if (!book) {
    console.warn('[Auth] 无法访问该档案:', bookId)
    return false
  }
  
  currentBookId.value = bookId
  Taro.setStorageSync(CURRENT_BOOK_KEY, bookId)
  
  return true
}

/**
 * 创建新档案
 */
async function createBook(name: string): Promise<UserBook | null> {
  try {
    await initCloud()
    
    const res = await Taro.cloud.callFunction({
      name: 'userAuth',
      data: { action: 'createBook', data: { name } }
    }) as { result: { success: boolean; data?: UserBook; error?: string } }
    
    if (res.result?.success && res.result.data) {
      // 刷新用户信息
      await refreshUserInfo()
      return res.result.data
    } else {
      Taro.showToast({ title: res.result?.error || '创建失败', icon: 'none' })
      return null
    }
  } catch (err) {
    console.error('[Auth] 创建档案失败:', err)
    return null
  }
}

/**
 * 生成档案分享码
 */
async function shareBook(bookId: string): Promise<ShareCodeResult | null> {
  try {
    await initCloud()
    
    const res = await Taro.cloud.callFunction({
      name: 'userAuth',
      data: { action: 'shareBook', data: { bookId } }
    }) as { result: { success: boolean; data?: ShareCodeResult; error?: string } }
    
    if (res.result?.success && res.result.data) {
      return res.result.data
    } else {
      Taro.showToast({ title: res.result?.error || '生成分享码失败', icon: 'none' })
      return null
    }
  } catch (err) {
    console.error('[Auth] 生成分享码失败:', err)
    return null
  }
}

/**
 * 通过分享码加入档案
 */
async function joinBook(shareCode: string): Promise<JoinBookResult | null> {
  try {
    await initCloud()
    
    const res = await Taro.cloud.callFunction({
      name: 'userAuth',
      data: { action: 'joinBook', data: { shareCode } }
    }) as { result: { success: boolean; data?: JoinBookResult; error?: string } }
    
    if (res.result?.success && res.result.data) {
      // 刷新用户信息
      await refreshUserInfo()
      
      Taro.showToast({ 
        title: `已加入「${res.result.data.bookName}」`, 
        icon: 'success' 
      })
      
      return res.result.data
    } else {
      Taro.showToast({ title: res.result?.error || '加入失败', icon: 'none' })
      return null
    }
  } catch (err) {
    console.error('[Auth] 加入档案失败:', err)
    return null
  }
}

/**
 * 退出共享档案
 */
async function leaveBook(bookId: string): Promise<boolean> {
  try {
    await initCloud()
    
    const res = await Taro.cloud.callFunction({
      name: 'userAuth',
      data: { action: 'leaveBook', data: { bookId } }
    }) as { result: { success: boolean; error?: string } }
    
    if (res.result?.success) {
      // 如果退出的是当前档案，切换到第一个档案
      if (currentBookId.value === bookId) {
        const firstOwned = currentUser.value?.ownedBooks?.[0]
        if (firstOwned) {
          await selectBook(firstOwned.bookId)
        }
      }
      
      // 刷新用户信息
      await refreshUserInfo()
      
      return true
    } else {
      Taro.showToast({ title: res.result?.error || '退出失败', icon: 'none' })
      return false
    }
  } catch (err) {
    console.error('[Auth] 退出档案失败:', err)
    return false
  }
}

/**
 * 更新用户资料
 */
async function updateProfile(data: { nickname?: string; avatarUrl?: string }): Promise<boolean> {
  try {
    await initCloud()
    
    const res = await Taro.cloud.callFunction({
      name: 'userAuth',
      data: { action: 'updateProfile', data }
    }) as { result: { success: boolean; error?: string } }
    
    if (res.result?.success) {
      // 更新本地缓存
      if (currentUser.value) {
        if (data.nickname) currentUser.value.nickname = data.nickname
        if (data.avatarUrl) currentUser.value.avatarUrl = data.avatarUrl
        Taro.setStorageSync(USER_CACHE_KEY, JSON.stringify(currentUser.value))
      }
      return true
    } else {
      Taro.showToast({ title: res.result?.error || '更新失败', icon: 'none' })
      return false
    }
  } catch (err) {
    console.error('[Auth] 更新资料失败:', err)
    return false
  }
}

// ============= 兼容旧 API =============

/**
 * 获取当前档案 ID（兼容旧代码）
 */
function getBookId(): string {
  return currentBookId.value || ''
}

/**
 * 确保云端已认证（兼容旧代码）
 */
async function ensureCloudAuth(): Promise<void> {
  if (!isLoggedIn.value) {
    await silentLogin()
  }
}

// ============= 导出 =============
export function useAuth() {
  return {
    // 状态
    currentUser: readonly(currentUser),
    currentBookId: readonly(currentBookId),
    currentBook,
    allBooks,
    isLoggedIn: readonly(isLoggedIn),
    isAuthReady: readonly(isAuthReady),
    authLoading: readonly(authLoading),
    isCloudReady: readonly(isCloudReady),
    
    // 认证方法
    login,
    silentLogin,
    logout,
    refreshUserInfo,
    updateProfile,
    
    // 档案管理
    selectBook,
    createBook,
    shareBook,
    joinBook,
    leaveBook,
    
    // 兼容旧 API
    getBookId,
    ensureCloudAuth,
  }
}
