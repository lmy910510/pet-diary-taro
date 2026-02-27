import Taro from '@tarojs/taro'
import { ref, watch } from 'vue'
import { useAuth } from '@/composables/useAuth'
import type { Pet } from '@/types/index'

const pet = ref<Pet>(createEmptyPet())
const petLoading = ref(false)

// 同步状态
const syncStatus = ref<'idle' | 'syncing' | 'synced' | 'error'>('idle')
const lastSyncTime = ref<number>(0)

function createEmptyPet(): Pet {
  return {
    _id: '',
    name: '',
    breed: '',
    birthday: '',
    avatar: '',
    owners: [],
    ownerId: '',
    createdAt: Date.now(),
    qwenApiKey: ''
  }
}

// 获取当前档案的本地存储 key（用于离线缓存）
function getLocalCacheKey(): string {
  const { getBookId } = useAuth()
  const bookId = getBookId()
  return bookId ? `pet-secretary-pet-cache-${bookId}` : 'pet-secretary-pet-cache'
}

// ============= 云端操作 =============

/**
 * 从云端加载宠物信息
 */
async function loadPetFromCloud(): Promise<Pet | null> {
  const { getBookId, isCloudReady } = useAuth()
  const bookId = getBookId()
  
  if (!bookId || !isCloudReady.value) return null
  
  try {
    const res = await Taro.cloud.callFunction({
      name: 'petQuery',
      data: {
        action: 'getPet',
        data: { petBookId: bookId }
      }
    }) as { result: { success: boolean; data?: Pet[]; error?: string } }
    
    if (res.result?.success && res.result.data?.length) {
      return res.result.data[0]
    }
    return null
  } catch (err) {
    console.error('[Pet] 云端加载失败:', err)
    return null
  }
}

/**
 * 保存宠物信息到云端
 */
async function savePetToCloud(data: Partial<Pet>): Promise<string | null> {
  const { getBookId, isCloudReady } = useAuth()
  const bookId = getBookId()
  
  if (!bookId || !isCloudReady.value) return null
  
  try {
    syncStatus.value = 'syncing'
    
    const saveData = {
      ...data,
      petBookId: bookId,
      updatedAt: Date.now()
    }
    
    const res = await Taro.cloud.callFunction({
      name: 'petQuery',
      data: {
        action: 'savePet',
        data: {
          petBookId: bookId,
          petId: pet.value._id || null,
          saveData
        }
      }
    }) as { result: { success: boolean; id?: string; error?: string } }
    
    if (res.result?.success) {
      syncStatus.value = 'synced'
      lastSyncTime.value = Date.now()
      return res.result.id || null
    } else {
      syncStatus.value = 'error'
      console.error('[Pet] 云端保存失败:', res.result?.error)
      return null
    }
  } catch (err) {
    syncStatus.value = 'error'
    console.error('[Pet] 云端保存异常:', err)
    return null
  }
}

// ============= 本地缓存操作 =============

/**
 * 从本地缓存加载
 */
function loadFromLocalCache(): Pet | null {
  try {
    const key = getLocalCacheKey()
    const saved = Taro.getStorageSync(key)
    if (saved) {
      return typeof saved === 'string' ? JSON.parse(saved) : saved
    }
    return null
  } catch (err) {
    console.warn('[Pet] 本地缓存读取失败:', err)
    return null
  }
}

/**
 * 保存到本地缓存
 */
function saveToLocalCache(data: Pet): void {
  try {
    const key = getLocalCacheKey()
    Taro.setStorageSync(key, JSON.stringify(data))
  } catch (err) {
    console.warn('[Pet] 本地缓存保存失败:', err)
  }
}

// ============= 主要方法 =============

/**
 * 加载宠物信息（优先云端，本地缓存兜底）
 */
async function loadPet(): Promise<void> {
  petLoading.value = true
  syncStatus.value = 'syncing'
  
  try {
    // 1. 先从本地缓存快速恢复（提升体验）
    const localData = loadFromLocalCache()
    if (localData) {
      pet.value = { ...createEmptyPet(), ...localData }
    }
    
    // 2. 从云端加载最新数据
    const cloudData = await loadPetFromCloud()
    
    if (cloudData) {
      // 云端有数据，使用云端数据
      pet.value = { ...createEmptyPet(), ...cloudData }
      saveToLocalCache(pet.value)
      syncStatus.value = 'synced'
      lastSyncTime.value = Date.now()
    } else if (!localData) {
      // 云端和本地都没有，创建空白
      pet.value = createEmptyPet()
      syncStatus.value = 'idle'
    } else {
      // 本地有但云端没有（可能是新档案的本地数据未同步）
      // 尝试将本地数据上传到云端
      syncStatus.value = 'idle'
    }
  } catch (err) {
    console.error('[Pet] 加载失败:', err)
    syncStatus.value = 'error'
    
    // 出错时使用本地缓存
    const localData = loadFromLocalCache()
    if (localData) {
      pet.value = { ...createEmptyPet(), ...localData }
    } else {
      pet.value = createEmptyPet()
    }
  } finally {
    petLoading.value = false
  }
}

/**
 * 保存宠物信息（同时保存云端和本地）
 */
async function savePet(data: Partial<Pet>): Promise<void> {
  // 1. 立即更新本地状态
  Object.assign(pet.value, data)
  saveToLocalCache(pet.value)
  
  // 2. 异步保存到云端
  const cloudId = await savePetToCloud(data)
  
  // 3. 如果是新建，更新 _id
  if (cloudId && !pet.value._id) {
    pet.value._id = cloudId
    saveToLocalCache(pet.value)
  }
}

/**
 * 上传头像（小程序版本）
 */
function uploadAvatar(): Promise<string> {
  return new Promise((resolve, reject) => {
    Taro.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const tempPath = res.tempFilePaths[0]
        
        try {
          // 上传到云存储
          const { getBookId } = useAuth()
          const bookId = getBookId()
          const cloudPath = `pets/${bookId}/avatar_${Date.now()}.jpg`
          
          const uploadRes = await Taro.cloud.uploadFile({
            cloudPath,
            filePath: tempPath
          })
          
          const fileID = uploadRes.fileID
          
          // 保存到宠物信息
          await savePet({ avatar: fileID })
          resolve(fileID)
        } catch (err) {
          // 上传失败时使用临时路径
          console.warn('[Pet] 头像上传云存储失败，使用临时路径:', err)
          await savePet({ avatar: tempPath })
          resolve(tempPath)
        }
      },
      fail: (err) => {
        reject(err)
      }
    })
  })
}

/**
 * 上传主人头像
 */
function uploadOwnerAvatar(index: number): Promise<string> {
  return new Promise((resolve, reject) => {
    Taro.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const tempPath = res.tempFilePaths[0]
        
        try {
          // 上传到云存储
          const { getBookId } = useAuth()
          const bookId = getBookId()
          const cloudPath = `pets/${bookId}/owner_${index}_${Date.now()}.jpg`
          
          const uploadRes = await Taro.cloud.uploadFile({
            cloudPath,
            filePath: tempPath
          })
          
          const fileID = uploadRes.fileID
          
          // 更新主人列表
          const owners = [...(pet.value.owners || [])]
          if (index < owners.length) {
            owners[index] = { ...owners[index], avatar: fileID }
          } else {
            owners.push({ name: '', avatar: fileID })
          }
          await savePet({ owners })
          resolve(fileID)
        } catch (err) {
          // 上传失败时使用临时路径
          console.warn('[Pet] 主人头像上传失败，使用临时路径:', err)
          const owners = [...(pet.value.owners || [])]
          if (index < owners.length) {
            owners[index] = { ...owners[index], avatar: tempPath }
          } else {
            owners.push({ name: '', avatar: tempPath })
          }
          await savePet({ owners })
          resolve(tempPath)
        }
      },
      fail: (err) => {
        reject(err)
      }
    })
  })
}

/**
 * 更新主人名字
 */
async function updateOwnerName(index: number, name: string): Promise<void> {
  const owners = [...(pet.value.owners || [])]
  if (index < owners.length) {
    owners[index] = { ...owners[index], name }
    await savePet({ owners })
  }
}

/**
 * 删除主人
 */
async function removeOwner(index: number): Promise<void> {
  const owners = [...(pet.value.owners || [])]
  owners.splice(index, 1)
  await savePet({ owners })
}

/**
 * 清空内存中的宠物信息（切换档案时调用）
 */
function clearPet(): void {
  pet.value = createEmptyPet()
  syncStatus.value = 'idle'
}

// ============= 数据迁移 =============

/**
 * 将本地旧数据迁移到云端
 */
async function migrateLocalData(): Promise<boolean> {
  const { getBookId } = useAuth()
  const bookId = getBookId()
  
  if (!bookId) return false
  
  // 检查旧的本地存储 key
  const oldKey = `pet-secretary-pet-${bookId}`
  try {
    const oldData = Taro.getStorageSync(oldKey)
    if (oldData) {
      const parsed = typeof oldData === 'string' ? JSON.parse(oldData) : oldData
      
      // 检查云端是否已有数据
      const cloudData = await loadPetFromCloud()
      
      if (!cloudData && parsed) {
        // 云端没有，本地有，执行迁移
        console.log('[Pet] 发现本地旧数据，正在迁移到云端...')
        
        // 保存到云端
        await savePetToCloud(parsed)
        
        // 删除旧的本地存储
        Taro.removeStorageSync(oldKey)
        
        console.log('[Pet] 数据迁移完成')
        return true
      }
    }
  } catch (err) {
    console.warn('[Pet] 数据迁移失败:', err)
  }
  
  return false
}

// ============= 导出 =============

export function usePet() {
  return {
    pet,
    petLoading,
    syncStatus,
    lastSyncTime,
    savePet,
    uploadAvatar,
    uploadOwnerAvatar,
    updateOwnerName,
    removeOwner,
    loadPet,
    clearPet,
    migrateLocalData,
  }
}
