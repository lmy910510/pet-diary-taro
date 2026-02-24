<template>
  <div
    class="record-type-icon"
    :style="{
      width: size + 'px',
      height: size + 'px',
      borderRadius: Math.round(size * 0.25) + 'px',
      backgroundColor: typeConfig.lightColor,
    }"
  >
    <component
      :is="iconComponent"
      :size="Math.round(size * 0.5)"
      :stroke-width="1.8"
      :color="typeConfig.color"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue'
import type { RecordType } from '@/types/index'
import { RECORD_TYPE_MAP } from '@/types/index'
import { Stethoscope, UtensilsCrossed, Wallet, Heart, Scissors } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  type: RecordType
  size?: number
}>(), { size: 28 })

const iconMap: Record<RecordType, Component> = {
  medical: Stethoscope,
  diet: UtensilsCrossed,
  growth: Heart,
  grooming: Scissors,
  expense: Wallet,
}

const iconComponent = computed(() => iconMap[props.type])
const typeConfig = computed(() => RECORD_TYPE_MAP[props.type])
</script>

<style scoped>
.record-type-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
</style>
