import { ref } from 'vue'
import { useAuth } from '@/composables/useAuth'
import type { PetRecord, RecordType } from '@/types/index'

const records = ref<PetRecord[]>([])
const recordsLoading = ref(false)

// 获取当前档案的存储 key
function getStorageKey(): string {
  const { getBookId } = useAuth()
  const bookId = getBookId()
  return bookId ? `pet-secretary-records-${bookId}` : 'pet-secretary-records'
}

// 生成唯一 ID
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}

// 从本地存储加载记录
function loadRecords(): void {
  recordsLoading.value = true
  try {
    const key = getStorageKey()
    const saved = localStorage.getItem(key)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed)) {
        records.value = parsed
        return
      }
    }
    records.value = []
  } catch (err) {
    console.error('加载记录失败:', err)
    records.value = []
  } finally {
    recordsLoading.value = false
  }
}

// 保存到本地存储
function saveToLocal(): void {
  const key = getStorageKey()
  localStorage.setItem(key, JSON.stringify(records.value))
}

// 添加记录
function addRecord(record: Omit<PetRecord, '_id' | 'createdAt'>): PetRecord {
  const newRecord: PetRecord = {
    ...record,
    _id: generateId(),
    createdAt: Date.now()
  }
  records.value.unshift(newRecord)
  saveToLocal()
  return newRecord
}

// 更新记录
function updateRecord(id: string, data: Partial<PetRecord>): void {
  const idx = records.value.findIndex(r => r._id === id)
  if (idx !== -1) {
    Object.assign(records.value[idx], data)
    saveToLocal()
  }
}

// 删除记录
function deleteRecord(id: string): void {
  records.value = records.value.filter(r => r._id !== id)
  saveToLocal()
}

// 按类型筛选
function getRecordsByType(type?: RecordType): PetRecord[] {
  if (!type) return records.value
  return records.value.filter(r => r.type === type)
}

// 按日期筛选
function getRecordsByDate(date: string): PetRecord[] {
  return records.value.filter(r => r.eventDate === date)
}

// 清空内存中的记录（切换档案时调用）
function clearRecords(): void {
  records.value = []
}

export function useRecords() {
  return {
    records,
    recordsLoading,
    addRecord,
    updateRecord,
    deleteRecord,
    getRecordsByType,
    getRecordsByDate,
    loadRecords,
    clearRecords,
  }
}
