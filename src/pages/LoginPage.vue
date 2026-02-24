<template>
  <div class="login-page">
    <div class="login-header">
      <span class="login-header__emoji">🐾</span>
      <h1 class="login-header__title">宠秘</h1>
      <p class="login-header__desc">AI 宠物生活管理</p>
    </div>

    <div class="login-form">
      <!-- 预设档案按钮 -->
      <div class="preset-list">
        <button
          v-for="book in PRESET_BOOKS"
          :key="book.id"
          class="preset-btn"
          :disabled="loading"
          @click="handleLogin(book.id)"
        >
          <span class="preset-btn__emoji">{{ book.emoji }}</span>
          <span class="preset-btn__name">{{ book.name }}</span>
          <span class="preset-btn__id">{{ book.id }}</span>
        </button>
      </div>

      <!-- 分隔线 -->
      <div class="divider">
        <span class="divider__line" />
        <span class="divider__text">或输入档案号</span>
        <span class="divider__line" />
      </div>

      <!-- 自定义输入 -->
      <div class="custom-input-row">
        <input
          v-model="customId"
          class="custom-input"
          placeholder="请输入档案号..."
          maxlength="20"
          @keyup.enter="handleCustomLogin"
        />
        <button
          class="btn btn--primary btn--small"
          :disabled="loading || !customId.trim()"
          @click="handleCustomLogin"
        >
          {{ loading ? '进入中...' : '进入' }}
        </button>
      </div>

      <p class="login-tip">输入相同的档案号即可恢复数据</p>
    </div>

    <!-- 错误提示 -->
    <div v-if="errorMsg" class="error-toast" @click="errorMsg = ''">
      {{ errorMsg }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth, PRESET_BOOKS } from '@/composables/useAuth'

const router = useRouter()
const { signInWithBookId } = useAuth()

const loading = ref(false)
const errorMsg = ref('')
const customId = ref('')

async function handleLogin(bookId: string) {
  if (loading.value) return
  loading.value = true
  errorMsg.value = ''
  try {
    await signInWithBookId(bookId)
    router.replace('/vault')
  } catch (err: any) {
    errorMsg.value = err.message || '登录失败，请重试'
  } finally {
    loading.value = false
  }
}

function handleCustomLogin() {
  const id = customId.value.trim()
  if (!id) return
  handleLogin(id)
}
</script>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  max-width: 430px;
  margin: 0 auto;
  background-color: var(--background);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-8) var(--space-6);
}

.login-header {
  text-align: center;
  padding: 0 0 var(--space-8);

  &__emoji {
    font-size: 80px;
    display: block;
    margin-bottom: var(--space-4);
  }

  &__title {
    font-size: 32px;
    font-weight: var(--font-bold);
    color: var(--foreground);
    margin: 0 0 var(--space-2);
  }

  &__desc {
    font-size: var(--text-base);
    color: var(--muted-foreground);
    margin: 0;
  }
}

.login-form {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
}

.preset-list {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.preset-btn {
  width: 100%;
  height: 56px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background-color: var(--card);
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 0 var(--space-4);
  gap: var(--space-3);
  transition: all var(--transition-fast);

  &:hover:not(:disabled) {
    background-color: var(--muted);
    border-color: var(--primary);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &__emoji {
    font-size: 28px;
  }

  &__name {
    font-size: var(--text-base);
    font-weight: var(--font-medium);
    color: var(--foreground);
    flex: 1;
    text-align: left;
  }

  &__id {
    font-size: var(--text-sm);
    color: var(--muted-foreground);
    font-family: monospace;
  }
}

.divider {
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) 0;

  &__line {
    flex: 1;
    height: 1px;
    background-color: var(--border);
  }

  &__text {
    font-size: var(--text-sm);
    color: var(--muted-foreground);
    white-space: nowrap;
  }
}

.custom-input-row {
  width: 100%;
  display: flex;
  gap: var(--space-3);
}

.custom-input {
  flex: 1;
  height: 48px;
  padding: 0 var(--space-4);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font-size: var(--text-base);
  background: transparent;
  color: var(--foreground);
  outline: none;

  &:focus {
    border-color: var(--ring);
    box-shadow: 0 0 0 2px rgba(77, 182, 172, 0.15);
  }

  &::placeholder {
    color: var(--muted-foreground);
  }
}

.login-tip {
  font-size: var(--text-sm);
  color: var(--muted-foreground);
  margin: 0;
}

.btn {
  border-radius: var(--radius);
  font-weight: var(--font-medium);
  cursor: pointer;
  border: none;
  transition: all var(--transition-fast);
  display: flex;
  align-items: center;
  justify-content: center;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &--primary {
    background-color: var(--primary);
    color: var(--primary-foreground);

    &:hover:not(:disabled) {
      background-color: var(--primary-hover);
    }
  }

  &--small {
    height: 48px;
    padding: 0 var(--space-5);
    font-size: var(--text-base);
    white-space: nowrap;
  }
}

.error-toast {
  position: fixed;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  background-color: #ef4444;
  color: #fff;
  padding: var(--space-3) var(--space-5);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  white-space: nowrap;
  cursor: pointer;
  z-index: 9999;
  animation: fadeIn 0.2s ease;
}
</style>
