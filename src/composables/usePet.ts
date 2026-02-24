import { ref } from 'vue'
import { useAuth } from '@/composables/useAuth'
import type { Pet } from '@/types/index'

const pet = ref<Pet>(createEmptyPet())
const petLoading = ref(false)

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

// 获取当前档案的存储 key
function getStorageKey(): string {
  const { getBookId } = useAuth()
  const bookId = getBookId()
  return bookId ? `pet-secretary-pet-${bookId}` : 'pet-secretary-pet'
}

// 从本地存储加载宠物信息
function loadPet(): void {
  petLoading.value = true
  try {
    const key = getStorageKey()
    const saved = localStorage.getItem(key)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (parsed && typeof parsed === 'object') {
        pet.value = { ...createEmptyPet(), ...parsed }
        return
      }
    }
    pet.value = createEmptyPet()
  } catch (err) {
    console.error('加载宠物信息失败:', err)
    pet.value = createEmptyPet()
  } finally {
    petLoading.value = false
  }
}

// 保存到本地存储
function saveToLocal(): void {
  const key = getStorageKey()
  localStorage.setItem(key, JSON.stringify(pet.value))
}

// 保存宠物信息
function savePet(data: Partial<Pet>): void {
  Object.assign(pet.value, data)
  saveToLocal()
}

// 上传头像（暂用 base64）
function uploadAvatar(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => {
      const url = reader.result as string
      savePet({ avatar: url })
      resolve(url)
    }
    reader.readAsDataURL(file)
  })
}

// 上传/更新主人头像
function uploadOwnerAvatar(file: File, index: number): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => {
      const url = reader.result as string
      const owners = [...(pet.value.owners || [])]
      if (index < owners.length) {
        owners[index] = { ...owners[index], avatar: url }
      } else {
        owners.push({ name: '', avatar: url })
      }
      savePet({ owners })
      resolve(url)
    }
    reader.readAsDataURL(file)
  })
}

// 更新主人名字
function updateOwnerName(index: number, name: string): void {
  const owners = [...(pet.value.owners || [])]
  if (index < owners.length) {
    owners[index] = { ...owners[index], name }
    savePet({ owners })
  }
}

// 删除主人
function removeOwner(index: number): void {
  const owners = [...(pet.value.owners || [])]
  owners.splice(index, 1)
  savePet({ owners })
}

// 清空内存中的宠物信息（切换档案时调用）
function clearPet(): void {
  pet.value = createEmptyPet()
}

export function usePet() {
  return {
    pet,
    petLoading,
    savePet,
    uploadAvatar,
    uploadOwnerAvatar,
    updateOwnerName,
    removeOwner,
    loadPet,
    clearPet,
  }
}
