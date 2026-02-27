import Taro from '@tarojs/taro'
import { ref } from 'vue'
import { useAuth } from '@/composables/useAuth'
import type { PetRecord, RecordType } from '@/types/index'

const records = ref<PetRecord[]>([])
const recordsLoading = ref(false)

// 同步状态
const syncStatus = ref<'idle' | 'syncing' | 'synced' | 'error'>('idle')
const lastSyncTime = ref<number>(0)

// 离线操作队列
interface OfflineOperation {
  id: string
  type: 'add' | 'update' | 'delete'
  data: Partial<PetRecord>
  timestamp: number
}
const offlineQueue = ref<OfflineOperation[]>([])

// 获取当前档案的本地缓存 key
function getLocalCacheKey(): string {
  const { getBookId } = useAuth()
  const bookId = getBookId()
  return bookId ? `pet-secretary-records-cache-${bookId}` : 'pet-secretary-records-cache'
}

function getOfflineQueueKey(): string {
  const { getBookId } = useAuth()
  const bookId = getBookId()
  return bookId ? `pet-secretary-offline-queue-${bookId}` : 'pet-secretary-offline-queue'
}

// 生成唯一 ID
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}

// ============= 云端操作 =============

/**
 * 从云端加载记录
 */
async function loadRecordsFromCloud(): Promise<PetRecord[]> {
  const { getBookId, isCloudReady } = useAuth()
  const bookId = getBookId()
  
  if (!bookId || !isCloudReady.value) return []
  
  try {
    const res = await Taro.cloud.callFunction({
      name: 'petQuery',
      data: {
        action: 'getRecords',
        data: { petBookId: bookId }
      }
    }) as { result: { success: boolean; data?: PetRecord[]; error?: string } }
    
    if (res.result?.success && res.result.data) {
      return res.result.data
    }
    return []
  } catch (err) {
    console.error('[Records] 云端加载失败:', err)
    return []
  }
}

/**
 * 添加记录到云端
 */
async function addRecordToCloud(record: PetRecord): Promise<string | null> {
  const { getBookId, isCloudReady } = useAuth()
  const bookId = getBookId()
  
  if (!bookId || !isCloudReady.value) return null
  
  try {
    const res = await Taro.cloud.callFunction({
      name: 'petQuery',
      data: {
        action: 'addRecord',
        data: {
          record: {
            ...record,
            petBookId: bookId
          }
        }
      }
    }) as { result: { success: boolean; id?: string; error?: string } }
    
    if (res.result?.success) {
      return res.result.id || null
    }
    console.error('[Records] 云端添加失败:', res.result?.error)
    return null
  } catch (err) {
    console.error('[Records] 云端添加异常:', err)
    return null
  }
}

/**
 * 更新云端记录
 */
async function updateRecordInCloud(recordId: string, data: Partial<PetRecord>): Promise<boolean> {
  const { getBookId, isCloudReady } = useAuth()
  const bookId = getBookId()
  
  if (!bookId || !isCloudReady.value) return false
  
  try {
    const res = await Taro.cloud.callFunction({
      name: 'petQuery',
      data: {
        action: 'updateRecord',
        data: {
          petBookId: bookId,
          recordId,
          updateData: data
        }
      }
    }) as { result: { success: boolean; error?: string } }
    
    return res.result?.success || false
  } catch (err) {
    console.error('[Records] 云端更新异常:', err)
    return false
  }
}

/**
 * 删除云端记录
 */
async function deleteRecordFromCloud(recordId: string): Promise<boolean> {
  const { getBookId, isCloudReady } = useAuth()
  const bookId = getBookId()
  
  if (!bookId || !isCloudReady.value) return false
  
  try {
    const res = await Taro.cloud.callFunction({
      name: 'petQuery',
      data: {
        action: 'deleteRecord',
        data: {
          petBookId: bookId,
          recordId
        }
      }
    }) as { result: { success: boolean; error?: string } }
    
    return res.result?.success || false
  } catch (err) {
    console.error('[Records] 云端删除异常:', err)
    return false
  }
}

// ============= 本地缓存操作 =============

function loadFromLocalCache(): PetRecord[] {
  try {
    const key = getLocalCacheKey()
    const saved = Taro.getStorageSync(key)
    if (saved) {
      const parsed = typeof saved === 'string' ? JSON.parse(saved) : saved
      if (Array.isArray(parsed)) {
        return parsed
      }
    }
    return []
  } catch (err) {
    console.warn('[Records] 本地缓存读取失败:', err)
    return []
  }
}

function saveToLocalCache(): void {
  try {
    const key = getLocalCacheKey()
    Taro.setStorageSync(key, JSON.stringify(records.value))
  } catch (err) {
    console.warn('[Records] 本地缓存保存失败:', err)
  }
}

function loadOfflineQueue(): void {
  try {
    const key = getOfflineQueueKey()
    const saved = Taro.getStorageSync(key)
    if (saved) {
      const parsed = typeof saved === 'string' ? JSON.parse(saved) : saved
      if (Array.isArray(parsed)) {
        offlineQueue.value = parsed
      }
    }
  } catch (err) {
    console.warn('[Records] 离线队列读取失败:', err)
  }
}

function saveOfflineQueue(): void {
  try {
    const key = getOfflineQueueKey()
    Taro.setStorageSync(key, JSON.stringify(offlineQueue.value))
  } catch (err) {
    console.warn('[Records] 离线队列保存失败:', err)
  }
}

// ============= 主要方法 =============

/**
 * 加载记录（优先云端，本地缓存兜底）
 */
async function loadRecords(): Promise<void> {
  recordsLoading.value = true
  syncStatus.value = 'syncing'
  
  try {
    // 1. 先从本地缓存快速恢复
    const localData = loadFromLocalCache()
    if (localData.length > 0) {
      records.value = localData
    }
    
    // 加载离线队列
    loadOfflineQueue()
    
    // 2. 从云端加载最新数据
    const cloudData = await loadRecordsFromCloud()
    
    if (cloudData.length > 0 || localData.length === 0) {
      records.value = cloudData
      saveToLocalCache()
      syncStatus.value = 'synced'
      lastSyncTime.value = Date.now()
    }
    
    // 3. 处理离线队列
    if (offlineQueue.value.length > 0) {
      await processOfflineQueue()
    }
  } catch (err) {
    console.error('[Records] 加载失败:', err)
    syncStatus.value = 'error'
    
    // 出错时使用本地缓存
    const localData = loadFromLocalCache()
    records.value = localData
  } finally {
    recordsLoading.value = false
  }
}

/**
 * 处理离线操作队列
 */
async function processOfflineQueue(): Promise<void> {
  if (offlineQueue.value.length === 0) return
  
  console.log(`[Records] 处理 ${offlineQueue.value.length} 个离线操作...`)
  
  const queue = [...offlineQueue.value]
  offlineQueue.value = []
  
  for (const op of queue) {
    try {
      switch (op.type) {
        case 'add':
          await addRecordToCloud(op.data as PetRecord)
          break
        case 'update':
          if (op.id) {
            await updateRecordInCloud(op.id, op.data)
          }
          break
        case 'delete':
          if (op.id) {
            await deleteRecordFromCloud(op.id)
          }
          break
      }
    } catch (err) {
      console.warn('[Records] 离线操作失败，重新加入队列:', err)
      offlineQueue.value.push(op)
    }
  }
  
  saveOfflineQueue()
  
  // 重新从云端加载以确保数据一致
  if (queue.length > 0) {
    const cloudData = await loadRecordsFromCloud()
    if (cloudData.length > 0) {
      records.value = cloudData
      saveToLocalCache()
    }
  }
}

/**
 * 添加记录
 */
async function addRecord(record: Omit<PetRecord, '_id' | 'createdAt'>): Promise<PetRecord> {
  const newRecord: PetRecord = {
    ...record,
    _id: generateId(), // 临时 ID
    createdAt: Date.now()
  }
  
  // 1. 立即更新本地状态
  records.value.unshift(newRecord)
  saveToLocalCache()
  
  // 2. 异步保存到云端
  const cloudId = await addRecordToCloud(newRecord)
  
  if (cloudId) {
    // 更新为云端 ID
    const idx = records.value.findIndex(r => r._id === newRecord._id)
    if (idx !== -1) {
      records.value[idx]._id = cloudId
      saveToLocalCache()
    }
    syncStatus.value = 'synced'
    lastSyncTime.value = Date.now()
  } else {
    // 云端保存失败，加入离线队列
    offlineQueue.value.push({
      id: newRecord._id,
      type: 'add',
      data: newRecord,
      timestamp: Date.now()
    })
    saveOfflineQueue()
    syncStatus.value = 'error'
  }
  
  return newRecord
}

/**
 * 更新记录
 */
async function updateRecord(id: string, data: Partial<PetRecord>): Promise<void> {
  const idx = records.value.findIndex(r => r._id === id)
  if (idx === -1) return
  
  // 1. 立即更新本地状态
  Object.assign(records.value[idx], data)
  saveToLocalCache()
  
  // 2. 异步更新云端
  const success = await updateRecordInCloud(id, data)
  
  if (success) {
    syncStatus.value = 'synced'
    lastSyncTime.value = Date.now()
  } else {
    // 加入离线队列
    offlineQueue.value.push({
      id,
      type: 'update',
      data,
      timestamp: Date.now()
    })
    saveOfflineQueue()
    syncStatus.value = 'error'
  }
}

/**
 * 删除记录
 */
async function deleteRecord(id: string): Promise<void> {
  // 1. 立即更新本地状态
  records.value = records.value.filter(r => r._id !== id)
  saveToLocalCache()
  
  // 2. 异步删除云端
  const success = await deleteRecordFromCloud(id)
  
  if (success) {
    syncStatus.value = 'synced'
    lastSyncTime.value = Date.now()
  } else {
    // 加入离线队列
    offlineQueue.value.push({
      id,
      type: 'delete',
      data: {},
      timestamp: Date.now()
    })
    saveOfflineQueue()
    syncStatus.value = 'error'
  }
}

/**
 * 按类型筛选
 */
function getRecordsByType(type?: RecordType): PetRecord[] {
  if (!type) return records.value
  return records.value.filter(r => r.type === type)
}

/**
 * 按日期筛选
 */
function getRecordsByDate(date: string): PetRecord[] {
  return records.value.filter(r => r.eventDate === date)
}

/**
 * 清空内存中的记录（切换档案时调用）
 */
function clearRecords(): void {
  records.value = []
  offlineQueue.value = []
  syncStatus.value = 'idle'
}

/**
 * 手动同步
 */
async function syncRecords(): Promise<boolean> {
  syncStatus.value = 'syncing'
  
  try {
    // 先处理离线队列
    await processOfflineQueue()
    
    // 重新加载云端数据
    const cloudData = await loadRecordsFromCloud()
    records.value = cloudData
    saveToLocalCache()
    
    syncStatus.value = 'synced'
    lastSyncTime.value = Date.now()
    return true
  } catch (err) {
    console.error('[Records] 同步失败:', err)
    syncStatus.value = 'error'
    return false
  }
}

// ============= 数据迁移 =============

/**
 * 将本地旧数据迁移到云端
 */
async function migrateLocalData(): Promise<number> {
  const { getBookId } = useAuth()
  const bookId = getBookId()
  
  if (!bookId) return 0
  
  // 检查旧的本地存储 key
  const oldKey = `pet-secretary-records-${bookId}`
  try {
    const oldData = Taro.getStorageSync(oldKey)
    if (oldData) {
      const parsed = typeof oldData === 'string' ? JSON.parse(oldData) : oldData
      
      if (Array.isArray(parsed) && parsed.length > 0) {
        // 检查云端是否已有数据
        const cloudData = await loadRecordsFromCloud()
        
        if (cloudData.length === 0) {
          // 云端没有数据，执行迁移
          console.log(`[Records] 发现 ${parsed.length} 条本地旧数据，正在迁移到云端...`)
          
          let migratedCount = 0
          for (const record of parsed) {
            const cloudId = await addRecordToCloud(record)
            if (cloudId) {
              migratedCount++
            }
          }
          
          // 删除旧的本地存储
          Taro.removeStorageSync(oldKey)
          
          // 重新加载云端数据
          await loadRecords()
          
          console.log(`[Records] 数据迁移完成，成功 ${migratedCount} 条`)
          return migratedCount
        }
      }
    }
  } catch (err) {
    console.warn('[Records] 数据迁移失败:', err)
  }
  
  return 0
}

// ============= 导出 =============

export function useRecords() {
  return {
    records,
    recordsLoading,
    syncStatus,
    lastSyncTime,
    offlineQueue,
    addRecord,
    updateRecord,
    deleteRecord,
    getRecordsByType,
    getRecordsByDate,
    loadRecords,
    clearRecords,
    syncRecords,
    migrateLocalData,
  }
}
