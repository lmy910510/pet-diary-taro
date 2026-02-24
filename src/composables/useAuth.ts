import { ref, readonly } from 'vue'
import { auth } from '@/cloudbase'

const BOOK_ID_KEY = 'pet-secretary-book-id'

// 预设档案列表
export const PRESET_BOOKS = [
  { id: 'cat001', name: '猫咪档案', emoji: '🐱' },
  { id: 'dog001', name: '狗狗档案', emoji: '🐶' },
  { id: 'rabbit001', name: '兔兔档案', emoji: '🐰' },
]

// 当前档案 ID
const currentBookId = ref<string | null>(localStorage.getItem(BOOK_ID_KEY))
const isLoggedIn = ref(!!currentBookId.value)
const isAuthReady = ref(false)
const authLoading = ref(false)
// 云端认证是否就绪
const isCloudReady = ref(false)

// 初始化：监听云端登录态变化（匿名登录用于获取数据库权限）
auth.onAuthStateChange((event: string, session: any, info: any) => {
  if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
    if (session) {
      isCloudReady.value = true
    }
  }
  isAuthReady.value = true
})

// 确保云端匿名登录（用于数据库读写权限）
async function ensureCloudAuth() {
  if (isCloudReady.value) return
  try {
    console.log('[Auth] 开始匿名登录...')
    const { error, data } = await auth.signInAnonymously()
    if (!error) {
      isCloudReady.value = true
      console.log('[Auth] 匿名登录成功', data)
    } else {
      console.error('[Auth] 匿名登录失败:', error)
    }
  } catch (err) {
    console.error('[Auth] 匿名登录异常:', err)
  }
}

// 使用档案 ID 登录
async function signInWithBookId(bookId: string) {
  authLoading.value = true
  try {
    // 确保有云端认证（匿名登录获取数据库权限）
    await ensureCloudAuth()
    // 保存档案 ID
    currentBookId.value = bookId
    localStorage.setItem(BOOK_ID_KEY, bookId)
    isLoggedIn.value = true
  } finally {
    authLoading.value = false
  }
}

// 退出登录（只清除档案 ID，不退出云端认证）
function signOut() {
  currentBookId.value = null
  isLoggedIn.value = false
  localStorage.removeItem(BOOK_ID_KEY)
}

// 获取当前档案 ID
function getBookId(): string {
  return currentBookId.value || ''
}

// 获取当前档案的预设信息
function getBookInfo() {
  const preset = PRESET_BOOKS.find(b => b.id === currentBookId.value)
  return preset || { id: currentBookId.value || '', name: currentBookId.value || '', emoji: '📋' }
}

export function useAuth() {
  return {
    currentBookId: readonly(currentBookId),
    isLoggedIn: readonly(isLoggedIn),
    isAuthReady: readonly(isAuthReady),
    authLoading: readonly(authLoading),
    isCloudReady: readonly(isCloudReady),
    signInWithBookId,
    signOut,
    getBookId,
    getBookInfo,
    ensureCloudAuth,
  }
}
