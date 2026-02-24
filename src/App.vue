<template>
  <div class="app-container">
    <template v-if="isAuthReady">
      <router-view ref="currentPageRef" />
      <TabBar v-if="showTabBar" @add="onAdd" />
    </template>
    <div v-else class="app-loading">
      <span class="app-loading__emoji">🐾</span>
      <span class="app-loading__text">加载中...</span>
    </div>

    <!-- 全局 AI 识别弹窗（非档案页时使用） -->
    <AiRecognizeSheet
      :visible="showGlobalSheet"
      @update:visible="showGlobalSheet = $event"
      @confirm="onGlobalConfirm"
    />
    <SToast ref="globalToastRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TabBar from '@/components/TabBar.vue'
import AiRecognizeSheet from '@/components/AiRecognizeSheet.vue'
import SToast from '@/components/SToast.vue'
import { useAuth } from '@/composables/useAuth'
import { useRecords } from '@/composables/useRecords'
import { usePet } from '@/composables/usePet'
import type { RecordType } from '@/types/index'

const route = useRoute()
const router = useRouter()
const { isAuthReady, isLoggedIn } = useAuth()
const { loadRecords, addRecord } = useRecords()
const { loadPet, pet } = usePet()

const currentPageRef = ref<any>(null)
const showGlobalSheet = ref(false)
const globalToastRef = ref<InstanceType<typeof SToast> | null>(null)

const showTabBar = computed(() => {
  return route.meta.requiresAuth && isLoggedIn.value
})

function onAdd() {
  // 如果在档案页，直接操作档案页的 showSheet
  if (route.path === '/vault' && currentPageRef.value?.showSheet !== undefined) {
    currentPageRef.value.showSheet = true
  } else {
    // 其他页面使用全局弹窗
    showGlobalSheet.value = true
  }
}

async function onGlobalConfirm(data: { title: string; content: string; eventDate: string; type: string; imageUrl: string; aiRawData?: Record<string, unknown> }) {
  const result = addRecord({
    petId: pet.value._id || '',
    type: data.type as RecordType,
    title: data.title,
    content: data.content,
    eventDate: data.eventDate,
    imageUrl: data.imageUrl,
    aiRawData: data.aiRawData,
    status: 'confirmed'
  })
  if (result) {
    globalToastRef.value?.show('已保存', 'success')
  } else {
    globalToastRef.value?.show('保存失败', 'error')
  }
}

// 路由守卫逻辑
watch([isAuthReady, isLoggedIn, () => route.path], async ([ready, loggedIn, path]) => {
  if (!ready) return
  if (route.meta.requiresAuth && !loggedIn) {
    router.replace('/login')
  } else if (route.meta.guest && loggedIn) {
    router.replace('/vault')
  }
}, { immediate: true })

// 登录后加载数据
watch(isLoggedIn, (loggedIn) => {
  if (loggedIn) {
    loadPet()
    loadRecords()
  }
}, { immediate: true })
</script>

<style lang="scss" scoped>
.app-container {
  min-height: 100vh;
  max-width: 430px;
  margin: 0 auto;
  position: relative;
  background-color: var(--background);
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.05);
}

@media (min-width: 431px) {
  .app-container {
    min-height: 100vh;
  }
}

.app-loading {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);

  &__emoji {
    font-size: 48px;
    animation: pulse 1.5s ease-in-out infinite;
  }

  &__text {
    font-size: var(--text-base);
    color: var(--muted-foreground);
  }
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}
</style>
