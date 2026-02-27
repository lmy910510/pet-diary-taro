<template>
  <view
    class="record-type-icon"
    :style="{
      width: sizeRpx,
      height: sizeRpx,
      borderRadius: radiusRpx,
      backgroundColor: typeConfig.lightColor,
    }"
  >
    <image 
      class="record-type-icon__img"
      :src="iconSrc"
      :style="{ width: iconSizeRpx, height: iconSizeRpx }"
      mode="aspectFit"
    />
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { RecordType } from '@/types/index'
import { RECORD_TYPE_MAP } from '@/types/index'

// 使用静态文件路径引用 Lucide 图标
const iconPathMap: Record<RecordType, string> = {
  medical: '/static/icons/stethoscope.svg',      // 听诊器 - 医疗
  diet: '/static/icons/utensils-crossed.svg',    // 交叉餐具 - 饮食
  growth: '/static/icons/heart.svg',             // 爱心 - 成长
  grooming: '/static/icons/scissors.svg',        // 剪刀 - 美容
  expense: '/static/icons/pill.svg',             // 保留兼容
}

const props = withDefaults(defineProps<{
  type: RecordType
  size?: number
}>(), { size: 80 })

const sizeRpx = computed(() => props.size + 'rpx')
// 嵌套圆角：金刚区父容器 36rpx - padding 20rpx = 16rpx (size=120时)
// 通用比例约 0.133
const radiusRpx = computed(() => Math.round(props.size * 0.133) + 'rpx')
const iconSizeRpx = computed(() => Math.round(props.size * 0.5) + 'rpx')
const iconSrc = computed(() => iconPathMap[props.type] || iconPathMap.medical)
const typeConfig = computed(() => RECORD_TYPE_MAP[props.type] || RECORD_TYPE_MAP.medical)
</script>

<style lang="scss">
.record-type-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &__img {
    flex-shrink: 0;
  }
}
</style>
