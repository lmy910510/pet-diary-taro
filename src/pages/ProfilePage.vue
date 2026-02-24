<template>
  <div class="page">
    <!-- 头像区 -->
    <div class="profile-header">
      <div class="profile-header__avatar-group">
        <!-- 宠物主头像 -->
        <div class="profile-header__avatar" @click="changeAvatar">
          <img v-if="pet.avatar" :src="pet.avatar" class="profile-header__avatar-img" />
          <span v-else class="profile-header__emoji">🐱</span>
        </div>

        <!-- 主人1头像（右下角） -->
        <div
          class="profile-header__owner profile-header__owner--first"
          @click="owners.length > 0 ? onOwnerTap(0) : addOwner(0)"
        >
          <img v-if="owners.length > 0 && owners[0].avatar" :src="owners[0].avatar" class="profile-header__owner-img" />
          <span v-else class="profile-header__owner-emoji">👧</span>
          <span v-if="owners.length > 0 && owners[0].name" class="profile-header__owner-name">{{ owners[0].name }}</span>
        </div>

        <!-- 主人2头像（左下角） -->
        <div
          v-if="owners.length >= 1"
          class="profile-header__owner profile-header__owner--second"
          @click="owners.length > 1 ? onOwnerTap(1) : addOwner(owners.length)"
        >
          <img v-if="owners.length > 1 && owners[1].avatar" :src="owners[1].avatar" class="profile-header__owner-img" />
          <span v-else class="profile-header__owner-emoji">👧</span>
          <span v-if="owners.length > 1 && owners[1].name" class="profile-header__owner-name">{{ owners[1].name }}</span>
        </div>
      </div>
      <span class="profile-header__name">{{ pet.name }}</span>
    </div>

    <!-- 基本信息 -->
    <div class="section">
      <span class="section__label">基本信息</span>
      <div class="info-card">
        <div class="info-item" @click="editField('name')">
          <span class="info-item__label">名字</span>
          <div class="info-item__right">
            <span class="info-item__value">{{ pet.name }}</span>
            <span class="info-item__chevron">›</span>
          </div>
        </div>
        <div class="info-item" @click="editField('breed')">
          <span class="info-item__label">品种</span>
          <div class="info-item__right">
            <span class="info-item__value">{{ pet.breed }}</span>
            <span class="info-item__chevron">›</span>
          </div>
        </div>
        <div class="info-item" @click="editField('birthday')">
          <span class="info-item__label">生日</span>
          <div class="info-item__right">
            <span class="info-item__value">{{ pet.birthday || '未设置' }}</span>
            <span class="info-item__chevron">›</span>
          </div>
        </div>
        <div class="info-item" @click="showWeightHistory = true">
          <span class="info-item__label">⚖️ 体重记录</span>
          <div class="info-item__right">
            <span class="info-item__value">{{ latestWeightText }}</span>
            <span class="info-item__chevron">›</span>
          </div>
        </div>
      </div>
    </div>

    <!-- AI 设置 -->
    <div class="section">
      <span class="section__label">AI 设置（通义千问）</span>
      <div class="info-card">
        <!-- API Key 输入 -->
        <div class="info-item info-item--column">
          <span class="info-item__label">通义千问 API Key</span>
          <div class="info-item__input-row">
            <input
              :type="showKey ? 'text' : 'password'"
              class="info-item__input"
              :value="apiKey"
              placeholder="sk-..."
              @input="onApiKeyInput"
            />
            <button class="info-item__toggle" @click="showKey = !showKey">
              {{ showKey ? '隐藏' : '显示' }}
            </button>
          </div>
          <span class="info-item__hint">
            用于 AI 图片识别（支持病历、日历、截图等），密钥已同步至云端，切换设备无需重新填写
          </span>
          <a
            class="info-item__link"
            href="https://dashscope.console.aliyun.com/apiKey"
            target="_blank"
          >
            前往阿里云获取通义千问 API Key →
          </a>
        </div>
      </div>
    </div>

    <!-- 账号信息 -->
    <div class="section">
      <span class="section__label">档案信息</span>
      <div class="info-card">
        <div class="info-item">
          <span class="info-item__label">当前档案</span>
          <div class="info-item__right">
            <span class="info-item__value">{{ bookInfo.emoji }} {{ bookInfo.name }}</span>
          </div>
        </div>
        <div class="info-item">
          <span class="info-item__label">档案 ID</span>
          <div class="info-item__right">
            <span class="info-item__value info-item__value--small">{{ currentBookId || '-' }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 设置 -->
    <div class="section">
      <span class="section__label">设置</span>
      <div class="info-card">
        <div class="info-item" @click="onSettingTap('export')">
          <span class="info-item__label">数据导出</span>
          <div class="info-item__right">
            <span class="info-item__chevron">›</span>
          </div>
        </div>
        <div class="info-item" @click="onSettingTap('about')">
          <span class="info-item__label">关于我们</span>
          <div class="info-item__right">
            <span class="info-item__chevron">›</span>
          </div>
        </div>
        <div class="info-item info-item--danger" @click="handleLogout">
          <span class="info-item__label" style="color: #ef4444;">退出登录</span>
          <div class="info-item__right">
            <span class="info-item__chevron">›</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 版本号 -->
    <span class="version">宠秘 v1.0.0</span>

    <!-- 编辑弹窗 -->
    <Teleport to="body">
      <div v-if="editModal.visible" class="modal-mask" @click.self="editModal.visible = false">
        <div class="modal">
          <span class="modal__title">编辑{{ editModal.label }}</span>
          <input
            v-if="editModal.field !== 'birthday'"
            class="modal__input"
            v-model="editModal.value"
            :placeholder="`请输入${editModal.label}`"
          />
          <input
            v-else
            type="date"
            class="modal__input"
            v-model="editModal.value"
          />
          <div class="modal__actions">
            <button class="modal__btn modal__btn--cancel" @click="editModal.visible = false">取消</button>
            <button class="modal__btn modal__btn--confirm" @click="saveEdit">确认</button>
          </div>
        </div>
      </div>

      <!-- 主人操作弹窗 -->
      <div v-if="ownerModal.visible" class="modal-mask" @click.self="ownerModal.visible = false">
        <div class="modal owner-modal">
          <div class="owner-modal__header">
            <span class="modal__title">{{ ownerModal.index < owners.length ? '编辑主人' : '添加主人' }}</span>
          </div>

          <div class="owner-modal__avatar-area" @click="pickOwnerAvatar">
            <img v-if="ownerModal.avatar" :src="ownerModal.avatar" class="owner-modal__avatar-img" />
            <div v-else class="owner-modal__avatar-empty">
              <span class="owner-modal__avatar-emoji">👧</span>
              <span>上传头像</span>
            </div>
          </div>

          <input
            class="modal__input"
            v-model="ownerModal.name"
            placeholder="主人的名字"
            maxlength="10"
          />

          <div class="modal__actions">
            <button v-if="ownerModal.index < owners.length" class="modal__btn modal__btn--danger" @click="handleRemoveOwner">移除</button>
            <button class="modal__btn modal__btn--cancel" @click="ownerModal.visible = false">取消</button>
            <button class="modal__btn modal__btn--confirm" @click="saveOwner">确认</button>
          </div>
        </div>
      </div>
    </Teleport>

    <SToast ref="toastRef" />

    <!-- 体重历史弹窗 -->
    <WeightHistorySheet
      :visible="showWeightHistory"
      @update:visible="showWeightHistory = $event"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { usePet } from '@/composables/usePet'
import { getAiApiKey } from '@/composables/useAiRecognize'
import { useRecords } from '@/composables/useRecords'
import { useAuth } from '@/composables/useAuth'

import SToast from '@/components/SToast.vue'
import WeightHistorySheet from '@/components/WeightHistorySheet.vue'

const router = useRouter()
const { pet, savePet, uploadAvatar, uploadOwnerAvatar, updateOwnerName, removeOwner } = usePet()
const { records, clearRecords } = useRecords()
const { currentBookId, signOut, getBookInfo } = useAuth()
const { clearPet } = usePet()
const toastRef = ref<InstanceType<typeof SToast> | null>(null)
const showWeightHistory = ref(false)

const bookInfo = computed(() => getBookInfo())
const owners = computed(() => pet.value.owners || [])

// 最新体重
const latestWeightText = computed(() => {
  const weightRecords = records.value
    .filter(r => r.type === 'growth' && r.aiRawData?.petWeight != null)
    .sort((a, b) => b.eventDate.localeCompare(a.eventDate))
  if (weightRecords.length === 0) return '暂无记录'
  return `${weightRecords[0].aiRawData?.petWeight} kg`
})

// AI 设置（通义千问）
const apiKey = ref(getAiApiKey('qwen'))
const showKey = ref(false)

function onApiKeyInput(e: Event) {
  const value = (e.target as HTMLInputElement).value
  apiKey.value = value
  localStorage.setItem('qwen-api-key', value)
  savePet({ qwenApiKey: value })
}

const editModal = reactive({
  visible: false,
  field: '' as string,
  label: '' as string,
  value: '' as string
})

const fieldLabels: Record<string, string> = {
  name: '名字',
  breed: '品种',
  birthday: '生日'
}

function changeAvatar() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = async () => {
    const file = input.files?.[0]
    if (file) {
      await uploadAvatar(file)
      toastRef.value?.show('头像已更新', 'success')
    }
  }
  input.click()
}

// === 主人操作 ===
const ownerModal = reactive({
  visible: false,
  index: 0,
  name: '',
  avatar: '',
  pendingFile: null as File | null
})

function onOwnerTap(index: number) {
  const o = owners.value[index]
  ownerModal.index = index
  ownerModal.name = o?.name || ''
  ownerModal.avatar = o?.avatar || ''
  ownerModal.pendingFile = null
  ownerModal.visible = true
}

function addOwner(index: number) {
  ownerModal.index = index
  ownerModal.name = ''
  ownerModal.avatar = ''
  ownerModal.pendingFile = null
  ownerModal.visible = true
}

function pickOwnerAvatar() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = () => {
    const file = input.files?.[0]
    if (file) {
      ownerModal.pendingFile = file
      const reader = new FileReader()
      reader.onload = () => {
        ownerModal.avatar = reader.result as string
      }
      reader.readAsDataURL(file)
    }
  }
  input.click()
}

async function saveOwner() {
  const idx = ownerModal.index
  if (ownerModal.pendingFile) {
    await uploadOwnerAvatar(ownerModal.pendingFile, idx)
  }
  if (ownerModal.name !== (owners.value[idx]?.name || '')) {
    await updateOwnerName(idx, ownerModal.name)
  }
  ownerModal.visible = false
  toastRef.value?.show('已保存', 'success')
}

async function handleRemoveOwner() {
  await removeOwner(ownerModal.index)
  ownerModal.visible = false
  toastRef.value?.show('已移除', 'success')
}

function editField(field: string) {
  editModal.field = field
  editModal.label = fieldLabels[field] || field
  editModal.value = (pet.value as any)[field] || ''
  editModal.visible = true
}

async function saveEdit() {
  await savePet({ [editModal.field]: editModal.value })
  editModal.visible = false
  toastRef.value?.show('已更新', 'success')
}

function onSettingTap(action: string) {
  switch (action) {
    case 'export': {
      const data = {
        pet: pet.value,
        records: records.value
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `宠秘数据_${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      toastRef.value?.show('已导出', 'success')
      break
    }
    case 'about':
      alert('宠秘 - AI 智能宠物生活管理 v1.0.0')
      break
  }
}

async function handleLogout() {
  if (confirm('确认退出当前档案？')) {
    clearRecords()
    clearPet()
    signOut()
    router.replace('/login')
  }
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background-color: var(--background);
  padding-bottom: calc(80px + env(safe-area-inset-bottom));
}

.profile-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-8) var(--space-4) var(--space-6);
  gap: var(--space-2);

  &__avatar-group {
    position: relative;
    width: 88px;
    height: 88px;
  }

  &__avatar {
    width: 88px;
    height: 88px;
    border-radius: var(--radius-full);
    background-color: var(--muted);
    display: flex;
    align-items: center;
    justify-content: center;
    border: 3px solid var(--card);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
    cursor: pointer;
    overflow: hidden;
    transition: opacity var(--transition-fast);
    position: relative;
    z-index: 1;

    &:hover { opacity: 0.85; }
  }

  &__avatar-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &__emoji {
    font-size: 44px;
  }

  &__owner {
    position: absolute;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    cursor: pointer;
    z-index: 3;
    transition: transform 0.15s ease;

    &:active { transform: scale(0.92); }

    &--first {
      bottom: -4px;
      right: -20px;
    }

    &--second {
      bottom: 8px;
      left: -24px;
    }
  }

  &__owner-img {
    width: 38px;
    height: 38px;
    border-radius: var(--radius-full);
    object-fit: cover;
    border: 2.5px solid var(--card);
    box-shadow: 0 1px 6px rgba(0, 0, 0, 0.1);
  }

  &__owner-emoji {
    width: 38px;
    height: 38px;
    border-radius: var(--radius-full);
    border: 2.5px solid var(--card);
    box-shadow: 0 1px 6px rgba(0, 0, 0, 0.1);
    background-color: var(--muted);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    line-height: 1;
  }

  &__owner-name {
    font-size: 10px;
    color: var(--muted-foreground);
    max-width: 48px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: center;
  }

  &__name {
    font-size: var(--text-xl);
    font-weight: var(--font-semibold);
    color: var(--foreground);
  }

  &__breed {
    font-size: var(--text-sm);
    color: var(--muted-foreground);
  }
}

.section {
  padding: 0 var(--space-4);
  margin-bottom: var(--space-5);

  &__label {
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    color: var(--muted-foreground);
    margin-bottom: var(--space-2);
    padding-left: var(--space-1);
    display: block;
  }
}

.info-card {
  background-color: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}

.info-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  transition: background-color var(--transition-fast);

  &:last-child { border-bottom: none; }
  &:hover { background-color: var(--muted); }

  &--danger:hover { background-color: rgba(239, 68, 68, 0.05); }

  &--column {
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-2);
    cursor: default;
    &:hover { background-color: transparent; }
  }

  &__label {
    font-size: var(--text-base);
    color: var(--foreground);
  }

  &__right {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  &__value {
    font-size: var(--text-base);
    color: var(--muted-foreground);

    &--small {
      font-size: var(--text-sm);
      font-family: monospace;
    }
  }

  &__chevron {
    font-size: var(--text-xl);
    color: var(--muted-foreground);
  }

  &__input-row {
    display: flex;
    gap: var(--space-2);
  }

  &__input {
    flex: 1;
    height: 36px;
    padding: 0 var(--space-3);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    font-size: var(--text-sm);
    background: transparent;
    outline: none;
    &:focus { border-color: var(--ring); }
  }

  &__toggle {
    height: 36px;
    padding: 0 var(--space-3);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: transparent;
    font-size: var(--text-sm);
    color: var(--muted-foreground);
    cursor: pointer;
    &:hover { background-color: var(--muted); }
  }

  &__hint {
    font-size: var(--text-xs);
    color: var(--muted-foreground);
    line-height: var(--leading-relaxed);
  }

  &__link {
    font-size: var(--text-xs);
    color: var(--primary);
    text-decoration: none;
    &:hover { text-decoration: underline; }
  }
}


.version {
  display: block;
  text-align: center;
  font-size: var(--text-sm);
  color: var(--muted-foreground);
  padding: var(--space-6) 0;
  opacity: 0.6;
}

/* 编辑弹窗 */
.modal-mask {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.2s ease;
}

.modal {
  width: calc(100% - 64px);
  max-width: 360px;
  background-color: var(--card);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);

  &__title {
    font-size: var(--text-lg);
    font-weight: var(--font-semibold);
    color: var(--foreground);
  }

  &__input {
    height: 44px;
    padding: 0 var(--space-4);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    font-size: var(--text-base);
    outline: none;
    width: 100%;
    &:focus {
      border-color: var(--ring);
      box-shadow: 0 0 0 2px rgba(77, 182, 172, 0.15);
    }
  }

  &__actions {
    display: flex;
    gap: var(--space-3);
  }

  &__btn {
    flex: 1;
    height: 40px;
    border-radius: var(--radius);
    font-size: var(--text-base);
    font-weight: var(--font-medium);
    cursor: pointer;
    border: none;
    transition: all var(--transition-fast);

    &--cancel {
      background-color: var(--muted);
      color: var(--foreground);
      &:hover { background-color: var(--border); }
    }

    &--confirm {
      background-color: var(--primary);
      color: var(--primary-foreground);
      &:hover { background-color: var(--primary-hover); }
    }

    &--danger {
      background-color: transparent;
      color: #EF4444;
      border: 1px solid #FCA5A5;
      &:hover { background-color: #FEF2F2; }
    }
  }
}

.owner-modal {
  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__avatar-area {
    align-self: center;
    width: 80px;
    height: 80px;
    border-radius: var(--radius-full);
    overflow: hidden;
    cursor: pointer;
    border: 2px dashed var(--border);
    transition: border-color 0.15s;

    &:hover { border-color: var(--primary); }
  }

  &__avatar-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &__avatar-empty {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    color: var(--muted-foreground);
    font-size: var(--text-xs);
  }

  &__avatar-emoji {
    font-size: 32px;
    line-height: 1;
  }
}
</style>
