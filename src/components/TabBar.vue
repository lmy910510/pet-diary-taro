<template>
  <nav class="ios-tab-wrapper">
    <div class="ios-tab">
      <!-- 胶囊 Tab 区 -->
      <div class="ios-tab__pill">
        <router-link
          v-for="tab in tabs"
          :key="tab.path"
          :to="tab.path"
          :class="['ios-tab__item', { 'ios-tab__item--active': isActive(tab.path) }]"
        >
          <svg class="ios-tab__svg" viewBox="0 0 24 24" fill="none" v-html="tab.iconSvg" />
          <transition name="ios-tab-label">
            <span v-if="isActive(tab.path)" class="ios-tab__label">{{ tab.label }}</span>
          </transition>
        </router-link>
      </div>

      <!-- 加号按钮 -->
      <button class="ios-tab__fab" @click="onAddTap" aria-label="新建记录">
        <svg class="ios-tab__fab-svg" viewBox="0 0 24 24" fill="none">
          <path d="M12 4.75v14.5M4.75 12h14.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()

const emit = defineEmits<{
  add: []
}>()

const tabs = [
  {
    path: '/vault',
    label: '档案',
    // folder / document icon – 线形
    iconSvg: `<path d="M3.75 5.75a1 1 0 011-1h4.586a1 1 0 01.707.293l1.414 1.414a1 1 0 00.707.293h6.086a1 1 0 011 1v10.5a1 1 0 01-1 1H4.75a1 1 0 01-1-1V5.75z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`
  },
  {
    path: '/calendar',
    label: '日历',
    // calendar icon – 线形
    iconSvg: `<rect x="3.75" y="4.75" width="16.5" height="16.5" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M3.75 9.25h16.5M8 3v3M16 3v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="8.5" cy="13.5" r="1" fill="currentColor"/><circle cx="12" cy="13.5" r="1" fill="currentColor"/><circle cx="15.5" cy="13.5" r="1" fill="currentColor"/>`
  },
  {
    path: '/profile',
    label: '我的',
    // person icon – 线形
    iconSvg: `<circle cx="12" cy="8" r="3.25" stroke="currentColor" stroke-width="1.5"/><path d="M5.75 19.25c0-2.9 2.8-5.5 6.25-5.5s6.25 2.6 6.25 5.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`
  }
]

function isActive(path: string) {
  return route.path === path
}

function onAddTap() {
  emit('add')
}
</script>

<style lang="scss" scoped>
/* ========================================
 * iOS 26–style floating Tab Bar
 * – 胶囊 pill + 独立圆形 FAB
 * – 毛玻璃材质 + 精细阴影
 * ======================================== */

.ios-tab-wrapper {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 430px;
  z-index: 500;
  pointer-events: none;
  padding: 0 16px calc(8px + env(safe-area-inset-bottom)) 16px;
}

.ios-tab {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  pointer-events: auto;

  /* ---- 胶囊容器 ---- */
  &__pill {
    display: inline-flex;
    align-items: center;
    height: 56px;
    background: rgba(250, 250, 249, 0.72);
    backdrop-filter: saturate(180%) blur(24px);
    -webkit-backdrop-filter: saturate(180%) blur(24px);
    border-radius: 28px;
    padding: 0 6px;
    gap: 2px;

    /* 精细多层阴影 — 模仿 iOS 浮岛 */
    box-shadow:
      0 0 0 0.5px rgba(0, 0, 0, 0.04),
      0 1px 1px rgba(0, 0, 0, 0.02),
      0 2px 8px rgba(0, 0, 0, 0.06),
      0 8px 24px rgba(0, 0, 0, 0.06);
  }

  /* ---- 单个 Tab ---- */
  &__item {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    height: 44px;
    padding: 0 16px;
    border-radius: 22px;
    text-decoration: none;
    color: rgba(60, 60, 67, 0.5);
    transition:
      color 0.35s cubic-bezier(0.4, 0, 0.2, 1),
      background-color 0.35s cubic-bezier(0.4, 0, 0.2, 1),
      padding 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    white-space: nowrap;
    -webkit-tap-highlight-color: transparent;

    &--active {
      color: #fff;
      background: var(--primary, #1C1917);
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.1),
        0 1px 4px rgba(0, 0, 0, 0.15);
    }
  }

  /* ---- SVG 图标 ---- */
  &__svg {
    width: 22px;
    height: 22px;
    flex-shrink: 0;
  }

  /* ---- 文字标签 ---- */
  &__label {
    font-size: 14px;
    font-weight: 600;
    line-height: 1;
    letter-spacing: -0.1px;
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'PingFang SC', sans-serif;
  }

  /* ---- 加号 FAB ---- */
  &__fab {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    border: none;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    color: rgba(60, 60, 67, 0.7);

    background: rgba(250, 250, 249, 0.72);
    backdrop-filter: saturate(180%) blur(24px);
    -webkit-backdrop-filter: saturate(180%) blur(24px);

    box-shadow:
      0 0 0 0.5px rgba(0, 0, 0, 0.04),
      0 1px 1px rgba(0, 0, 0, 0.02),
      0 2px 8px rgba(0, 0, 0, 0.06),
      0 8px 24px rgba(0, 0, 0, 0.06);

    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

    &:hover {
      background: rgba(250, 250, 249, 0.9);
      color: var(--primary, #1C1917);
    }

    &:active {
      transform: scale(0.92);
      background: rgba(240, 240, 238, 0.95);
    }
  }

  &__fab-svg {
    width: 24px;
    height: 24px;
  }
}

/* ---- Label 展开/收起动画 ---- */
.ios-tab-label-enter-active {
  transition: opacity 0.25s ease, max-width 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}
.ios-tab-label-leave-active {
  transition: opacity 0.15s ease, max-width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}
.ios-tab-label-enter-from {
  opacity: 0;
  max-width: 0;
}
.ios-tab-label-enter-to {
  opacity: 1;
  max-width: 60px;
}
.ios-tab-label-leave-from {
  opacity: 1;
  max-width: 60px;
}
.ios-tab-label-leave-to {
  opacity: 0;
  max-width: 0;
}

/* ---- 暗色模式适配 ---- */
@media (prefers-color-scheme: dark) {
  .ios-tab {
    &__pill {
      background: rgba(44, 44, 46, 0.72);
      box-shadow:
        0 0 0 0.5px rgba(255, 255, 255, 0.06),
        0 1px 1px rgba(0, 0, 0, 0.1),
        0 2px 8px rgba(0, 0, 0, 0.15),
        0 8px 24px rgba(0, 0, 0, 0.2);
    }

    &__item {
      color: rgba(235, 235, 245, 0.4);

      &--active {
        color: #fff;
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.1),
          0 1px 4px rgba(0, 0, 0, 0.3);
      }
    }

    &__fab {
      background: rgba(44, 44, 46, 0.72);
      color: rgba(235, 235, 245, 0.6);
      box-shadow:
        0 0 0 0.5px rgba(255, 255, 255, 0.06),
        0 1px 1px rgba(0, 0, 0, 0.1),
        0 2px 8px rgba(0, 0, 0, 0.15),
        0 8px 24px rgba(0, 0, 0, 0.2);

      &:hover {
        background: rgba(58, 58, 60, 0.85);
        color: var(--primary, #1C1917);
      }

      &:active {
        background: rgba(58, 58, 60, 0.95);
      }
    }
  }
}
</style>
