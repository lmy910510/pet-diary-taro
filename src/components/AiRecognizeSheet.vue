<template>
  <Teleport to="body">
    <div v-if="visible" class="sheet-mask" @click.self="handleClose">
      <div :class="['sheet', show ? 'sheet--visible' : '']">
        <div class="sheet__handle">
          <div class="sheet__bar" />
        </div>

        <!-- Step 1: 输入 -->
        <div v-if="step === 'choose'" class="sheet__body">
          <span class="sheet__title">添加记录</span>
          <!-- AI 万能输入框（文字 + 图片 + 语音） -->
          <AiInputBar
            ref="aiInputBarRef"
            :is-recording="voiceIsListening"
            :transcript="voiceTranscript"
            :speech-supported="speechSupported"
            @submit="handleAiInputSubmit"
            @start-recording="handleStartRecording"
            @stop-recording="handleStopRecording"
          />

          <!-- 快捷记录 -->
          <div class="sheet__quick-entries">
            <span class="sheet__quick-label">快捷记录</span>
            <div class="sheet__quick-list">
              <div class="sheet__quick-item" @click="step = 'weight'">
                <Scale class="sheet__quick-item-icon" :size="16" :stroke-width="1.5" />
                <span class="sheet__quick-item-text">体重</span>
              </div>
              <div class="sheet__quick-item" @click="step = 'deworm'">
                <Syringe class="sheet__quick-item-icon" :size="16" :stroke-width="1.5" />
                <span class="sheet__quick-item-text">驱虫/疫苗</span>
              </div>
              <div class="sheet__quick-item" @click="step = 'feeding'">
                <UtensilsCrossed class="sheet__quick-item-icon" :size="16" :stroke-width="1.5" />
                <span class="sheet__quick-item-text">喂食</span>
              </div>
              <div class="sheet__quick-item" @click="step = 'poop'">
                <Activity class="sheet__quick-item-icon" :size="16" :stroke-width="1.5" />
                <span class="sheet__quick-item-text">排泄</span>
              </div>
              <div class="sheet__quick-item" @click="step = 'grooming'">
                <Sparkles class="sheet__quick-item-icon" :size="16" :stroke-width="1.5" />
                <span class="sheet__quick-item-text">美容</span>
              </div>
              <div class="sheet__quick-item" @click="step = 'water'">
                <Droplets class="sheet__quick-item-icon" :size="16" :stroke-width="1.5" />
                <span class="sheet__quick-item-text">饮水</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Step: 体重记录 -->
        <div v-else-if="step === 'weight'" class="sheet__body">
          <span class="sheet__title">记录体重</span>

          <!-- 辅助计算：并排输入 -->
          <div class="sheet__calc-section">
            <span class="sheet__calc-label">辅助计算（选填）</span>
            <div class="sheet__calc-row">
              <div class="sheet__calc-input-wrap">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  class="sheet__calc-input"
                  v-model.number="totalWeight"
                  placeholder="抱宠物"
                  inputmode="decimal"
                />
                <span class="sheet__calc-unit">kg</span>
              </div>
              <span class="sheet__calc-minus">−</span>
              <div class="sheet__calc-input-wrap">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  class="sheet__calc-input"
                  v-model.number="humanWeight"
                  placeholder="人单独"
                  inputmode="decimal"
                />
                <span class="sheet__calc-unit">kg</span>
              </div>
            </div>
            <div v-if="weightError" class="sheet__calc-error">{{ weightError }}</div>
          </div>

          <!-- 宠物体重（主输入） -->
          <div class="sheet__weight-field">
            <label class="sheet__weight-label">宠物体重 (kg)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              class="sheet__weight-input sheet__weight-input--main"
              v-model.number="directPetWeight"
              placeholder="直接输入或由上方自动计算"
              inputmode="decimal"
            />
          </div>

          <!-- 日期选择 -->
          <div class="sheet__weight-field">
            <label class="sheet__weight-label">日期</label>
            <input type="date" class="sheet__weight-input" v-model="weightDate" />
          </div>

          <!-- 保存按钮 -->
          <button
            class="sheet__weight-save"
            :disabled="!canSaveWeight"
            @click="handleWeightConfirm"
          >
            保存记录
          </button>
        </div>

        <!-- Step: 驱虫/疫苗 -->
        <div v-else-if="step === 'deworm'" class="sheet__body">
          <span class="sheet__title">驱虫 / 疫苗</span>
          <div class="sheet__form-field">
            <label class="sheet__form-label">类型</label>
            <div class="sheet__chip-group">
              <div
                v-for="opt in dewormTypeOptions"
                :key="opt.value"
                :class="['sheet__chip', dewormForm.subType === opt.value ? 'sheet__chip--active' : '']"
                @click="dewormForm.subType = opt.value"
              >{{ opt.label }}</div>
            </div>
          </div>
          <div class="sheet__form-field">
            <label class="sheet__form-label">品牌/名称（选填）</label>
            <input class="sheet__form-input" v-model="dewormForm.brand" placeholder="如：大宠爱、妙三多" />
          </div>
          <div class="sheet__form-field">
            <label class="sheet__form-label">日期</label>
            <input type="date" class="sheet__form-input" v-model="dewormForm.date" />
          </div>
          <div class="sheet__form-field">
            <label class="sheet__form-label">备注（选填）</label>
            <input class="sheet__form-input" v-model="dewormForm.note" placeholder="如：体重5kg用半支" />
          </div>
          <button class="sheet__form-save" :disabled="!dewormForm.subType" @click="handleDewormConfirm">保存记录</button>
        </div>

        <!-- Step: 喂食 -->
        <div v-else-if="step === 'feeding'" class="sheet__body">
          <span class="sheet__title">喂食记录</span>
          <div class="sheet__form-field">
            <label class="sheet__form-label">餐次</label>
            <div class="sheet__chip-group">
              <div
                v-for="opt in mealOptions"
                :key="opt.value"
                :class="['sheet__chip', feedingForm.meal === opt.value ? 'sheet__chip--active' : '']"
                @click="feedingForm.meal = opt.value"
              >{{ opt.label }}</div>
            </div>
          </div>
          <div class="sheet__form-field">
            <label class="sheet__form-label">食量</label>
            <div class="sheet__chip-group">
              <div
                v-for="opt in appetiteOptions"
                :key="opt.value"
                :class="['sheet__chip', feedingForm.appetite === opt.value ? 'sheet__chip--active' : '']"
                @click="feedingForm.appetite = opt.value"
              >{{ opt.label }}</div>
            </div>
          </div>
          <div class="sheet__form-field">
            <label class="sheet__form-label">喂的什么</label>
            <div class="sheet__chip-group">
              <div
                v-for="opt in foodTypeOptions"
                :key="opt.value"
                :class="['sheet__chip', feedingForm.foodType === opt.value ? 'sheet__chip--active' : '']"
                @click="feedingForm.foodType = opt.value"
              >{{ opt.label }}</div>
            </div>
          </div>
          <div class="sheet__form-field">
            <label class="sheet__form-label">日期</label>
            <input type="date" class="sheet__form-input" v-model="feedingForm.date" />
          </div>
          <div class="sheet__form-field">
            <label class="sheet__form-label">备注（选填）</label>
            <input class="sheet__form-input" v-model="feedingForm.note" placeholder="如：换了新粮" />
          </div>
          <button class="sheet__form-save" :disabled="!feedingForm.meal || !feedingForm.appetite" @click="handleFeedingConfirm">保存记录</button>
        </div>

        <!-- Step: 排泄 -->
        <div v-else-if="step === 'poop'" class="sheet__body">
          <span class="sheet__title">排泄记录</span>
          <div class="sheet__form-field">
            <label class="sheet__form-label">类型</label>
            <div class="sheet__chip-group">
              <div
                v-for="opt in poopTypeOptions"
                :key="opt.value"
                :class="['sheet__chip', poopForm.poopType === opt.value ? 'sheet__chip--active' : '']"
                @click="poopForm.poopType = opt.value"
              >{{ opt.label }}</div>
            </div>
          </div>
          <div class="sheet__form-field">
            <label class="sheet__form-label">状态</label>
            <div class="sheet__chip-group">
              <div
                v-for="opt in poopStatusOptions"
                :key="opt.value"
                :class="['sheet__chip', poopForm.poopStatus === opt.value ? 'sheet__chip--active' : '']"
                @click="poopForm.poopStatus = opt.value"
              >{{ opt.label }}</div>
            </div>
          </div>
          <div class="sheet__form-field">
            <label class="sheet__form-label">日期</label>
            <input type="date" class="sheet__form-input" v-model="poopForm.date" />
          </div>
          <div class="sheet__form-field">
            <label class="sheet__form-label">备注（选填）</label>
            <input class="sheet__form-input" v-model="poopForm.note" placeholder="如：颜色偏黑" />
          </div>
          <button class="sheet__form-save" :disabled="!poopForm.poopType || !poopForm.poopStatus" @click="handlePoopConfirm">保存记录</button>
        </div>

        <!-- Step: 美容 -->
        <div v-else-if="step === 'grooming'" class="sheet__body">
          <span class="sheet__title">美容记录</span>
          <div class="sheet__form-field">
            <label class="sheet__form-label">项目</label>
            <div class="sheet__chip-group">
              <div
                v-for="opt in groomingItemOptions"
                :key="opt.value"
                :class="['sheet__chip', groomingForm.item === opt.value ? 'sheet__chip--active' : '']"
                @click="groomingForm.item = opt.value"
              >{{ opt.label }}</div>
            </div>
          </div>
          <div class="sheet__form-field">
            <label class="sheet__form-label">地点</label>
            <div class="sheet__chip-group">
              <div
                v-for="opt in groomingPlaceOptions"
                :key="opt.value"
                :class="['sheet__chip', groomingForm.place === opt.value ? 'sheet__chip--active' : '']"
                @click="groomingForm.place = opt.value"
              >{{ opt.label }}</div>
            </div>
          </div>
          <div class="sheet__form-field">
            <label class="sheet__form-label">花费（选填）</label>
            <input type="number" step="0.01" min="0" class="sheet__form-input" v-model.number="groomingForm.cost" placeholder="元" inputmode="decimal" />
          </div>
          <div class="sheet__form-field">
            <label class="sheet__form-label">日期</label>
            <input type="date" class="sheet__form-input" v-model="groomingForm.date" />
          </div>
          <button class="sheet__form-save" :disabled="!groomingForm.item" @click="handleGroomingConfirm">保存记录</button>
        </div>

        <!-- Step: 饮水 -->
        <div v-else-if="step === 'water'" class="sheet__body">
          <span class="sheet__title">饮水记录</span>
          <div class="sheet__form-field">
            <label class="sheet__form-label">饮水量</label>
            <div class="sheet__chip-group">
              <div
                v-for="opt in waterLevelOptions"
                :key="opt.value"
                :class="['sheet__chip', waterForm.level === opt.value ? 'sheet__chip--active' : '']"
                @click="waterForm.level = opt.value"
              >{{ opt.label }}</div>
            </div>
          </div>
          <div class="sheet__form-field">
            <label class="sheet__form-label">具体量（选填）</label>
            <div class="sheet__inline-input">
              <input type="number" step="10" min="0" class="sheet__form-input" v-model.number="waterForm.amount" placeholder="如：200" inputmode="decimal" />
              <span class="sheet__inline-unit">ml</span>
            </div>
          </div>
          <div class="sheet__form-field">
            <label class="sheet__form-label">日期</label>
            <input type="date" class="sheet__form-input" v-model="waterForm.date" />
          </div>
          <div class="sheet__form-field">
            <label class="sheet__form-label">备注（选填）</label>
            <input class="sheet__form-input" v-model="waterForm.note" placeholder="如：换了饮水机" />
          </div>
          <button class="sheet__form-save" :disabled="!waterForm.level" @click="handleWaterConfirm">保存记录</button>
        </div>

        <!-- Step 2: AI 识别中 -->
        <div v-else-if="step === 'loading'" class="sheet__body sheet__body--center">
          <div class="sheet__spinner" />
          <span class="sheet__loading-text">AI 正在识别...</span>
          <span class="sheet__loading-hint">正在分析图片内容</span>
        </div>

        <!-- Step 3: 确认结果 -->
        <div v-else-if="step === 'result'" class="sheet__body">
          <ConfirmCard
            :result="recognizeResult!"
            @confirm="handleConfirm"
            @cancel="handleClose"
          />
        </div>

        <!-- Error -->
        <div v-else-if="step === 'error'" class="sheet__body sheet__body--center">
          <AlertCircle class="sheet__error-icon" :size="32" :stroke-width="1.5" />
          <span class="sheet__error-text">{{ errorMsg || '识别失败，请重试' }}</span>
          <SButton variant="outline" size="sm" @tap="step = 'choose'">重新选择</SButton>
        </div>

        <!-- Step: 语音/文字 AI 处理中 -->
        <div v-else-if="step === 'voice-processing'" class="sheet__body sheet__body--center">
          <div class="sheet__spinner" />
          <span class="sheet__loading-text">AI 正在分析...</span>
          <span class="sheet__voice-transcript" v-if="voiceTranscript">「{{ voiceTranscript }}」</span>
          <span class="sheet__loading-hint">正在理解输入内容</span>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'
import type { RecognizeResult } from '@/types/index'
import { useAiRecognize } from '@/composables/useAiRecognize'
import { useVoiceRecognize, isSpeechRecognitionSupported } from '@/composables/useVoiceRecognize'
import { Scale, AlertCircle, Syringe, UtensilsCrossed, Activity, Sparkles, Droplets } from 'lucide-vue-next'
import ConfirmCard from './ConfirmCard.vue'
import SButton from './SButton.vue'
import AiInputBar from './AiInputBar.vue'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  confirm: [data: { title: string; content: string; eventDate: string; type: string; imageUrl: string; aiRawData?: Record<string, unknown> }]
}>()

type Step = 'choose' | 'loading' | 'result' | 'error' | 'weight' | 'voice-processing' | 'deworm' | 'feeding' | 'poop' | 'grooming' | 'water'
const step = ref<Step>('choose')
const show = ref(false)
const recognizeResult = ref<RecognizeResult | null>(null)
const errorMsg = ref('')
const imageDataUrl = ref('')
const manualVoiceText = ref('')
const speechSupported = isSpeechRecognitionSupported()
const aiInputBarRef = ref<InstanceType<typeof AiInputBar> | null>(null)

// 体重记录相关
const directPetWeight = ref<number | undefined>(undefined)
const totalWeight = ref<number | undefined>(undefined)
const humanWeight = ref<number | undefined>(undefined)
const weightDate = ref(getTodayStr())

// 驱虫/疫苗
const dewormTypeOptions = [
  { label: '内驱', value: 'internal' },
  { label: '外驱', value: 'external' },
  { label: '疫苗', value: 'vaccine' }
]
const dewormForm = ref({ subType: '', brand: '', date: getTodayStr(), note: '' })

// 喂食
const mealOptions = [
  { label: '早餐', value: 'breakfast' },
  { label: '午餐', value: 'lunch' },
  { label: '晚餐', value: 'dinner' },
  { label: '加餐', value: 'snack' }
]
const appetiteOptions = [
  { label: '正常', value: 'normal' },
  { label: '吃多了', value: 'more' },
  { label: '吃少了', value: 'less' },
  { label: '没吃', value: 'none' }
]
const foodTypeOptions = [
  { label: '主粮', value: 'staple' },
  { label: '罐头', value: 'canned' },
  { label: '零食', value: 'treat' },
  { label: '自制', value: 'homemade' }
]
const feedingForm = ref({ meal: '', appetite: '', foodType: '', date: getTodayStr(), note: '' })

// 排泄
const poopTypeOptions = [
  { label: '尿尿', value: 'pee' },
  { label: '便便', value: 'poop' },
  { label: '都有', value: 'both' }
]
const poopStatusOptions = [
  { label: '正常', value: 'normal' },
  { label: '偏稀', value: 'soft' },
  { label: '偏硬', value: 'hard' },
  { label: '异常', value: 'abnormal' }
]
const poopForm = ref({ poopType: '', poopStatus: '', date: getTodayStr(), note: '' })

// 美容
const groomingItemOptions = [
  { label: '洗澡', value: 'bath' },
  { label: '剪毛', value: 'haircut' },
  { label: '修指甲', value: 'nails' },
  { label: '清耳朵', value: 'ears' },
  { label: '挤肛门腺', value: 'glands' },
  { label: '梳毛', value: 'brushing' }
]
const groomingPlaceOptions = [
  { label: '家里', value: 'home' },
  { label: '宠物店', value: 'shop' }
]
const groomingForm = ref({ item: '', place: '', cost: undefined as number | undefined, date: getTodayStr() })

// 饮水
const waterLevelOptions = [
  { label: '很少', value: 'little' },
  { label: '正常', value: 'normal' },
  { label: '较多', value: 'much' }
]
const waterForm = ref({ level: '', amount: undefined as number | undefined, date: getTodayStr(), note: '' })


function getTodayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const calcPetWeight = computed(() => {
  if (totalWeight.value != null && humanWeight.value != null && totalWeight.value > humanWeight.value) {
    return Math.round((totalWeight.value - humanWeight.value) * 10) / 10
  }
  return 0
})

const weightError = computed(() => {
  if (totalWeight.value != null && humanWeight.value != null) {
    if (totalWeight.value <= 0 || humanWeight.value <= 0) return '体重必须大于 0'
    if (totalWeight.value <= humanWeight.value) return '抱宠体重应大于人体体重'
  }
  return ''
})

const calcValid = computed(() => {
  return (
    totalWeight.value != null &&
    humanWeight.value != null &&
    totalWeight.value > 0 &&
    humanWeight.value > 0 &&
    totalWeight.value > humanWeight.value
  )
})

const canSaveWeight = computed(() => {
  return directPetWeight.value != null && directPetWeight.value > 0
})

// 辅助计算自动回填宠物体重
watch(calcPetWeight, (val) => {
  if (val > 0) {
    directPetWeight.value = val
  }
})

const { status, result, error, recognize, reset } = useAiRecognize()
const {
  status: voiceStatus,
  result: voiceResult,
  error: voiceError,
  transcript: voiceTranscript,
  isListening: voiceIsListening,
  recognize: voiceRecognize,
  stopListening: voiceStopListening,
  parseWithAi: voiceParseWithAi,
  reset: voiceReset
} = useVoiceRecognize()

watch(
  () => props.visible,
  async (val) => {
    if (val) {
      step.value = 'choose'
      recognizeResult.value = null
      errorMsg.value = ''
      imageDataUrl.value = ''
      directPetWeight.value = undefined
      totalWeight.value = undefined
      humanWeight.value = undefined
      weightDate.value = getTodayStr()
      dewormForm.value = { subType: '', brand: '', date: getTodayStr(), note: '' }
      feedingForm.value = { meal: '', appetite: '', foodType: '', date: getTodayStr(), note: '' }
      poopForm.value = { poopType: '', poopStatus: '', date: getTodayStr(), note: '' }
      groomingForm.value = { item: '', place: '', cost: undefined, date: getTodayStr() }
      waterForm.value = { level: '', amount: undefined, date: getTodayStr(), note: '' }
      reset()
      voiceReset()
      manualVoiceText.value = ''
      aiInputBarRef.value?.resetBar()
      await nextTick()
      setTimeout(() => { show.value = true }, 50)
    } else {
      show.value = false
    }
  }
)

// 监听 AI 识别状态
watch(status, (val) => {
  if (val === 'uploading' || val === 'recognizing') {
    step.value = 'loading'
  } else if (val === 'done' && result.value) {
    recognizeResult.value = result.value
    step.value = 'result'
  } else if (val === 'error') {
    errorMsg.value = error.value
    step.value = 'error'
  }
})

// 监听语音识别状态
watch(voiceStatus, (val) => {
  if (val === 'processing') {
    step.value = 'voice-processing'
  } else if (val === 'done' && voiceResult.value) {
    recognizeResult.value = voiceResult.value
    step.value = 'result'
  } else if (val === 'error') {
    errorMsg.value = voiceError.value
    step.value = 'error'
  }
})

function handleClose() {
  voiceStopListening()
  show.value = false
  setTimeout(() => {
    emit('update:visible', false)
  }, 300)
}

/** AiInputBar: 用户提交（文字 + 图片） */
async function handleAiInputSubmit(payload: { text: string; images: File[] }) {
  const { text, images } = payload

  // 有图片 → 走图片 AI 识别
  if (images.length > 0) {
    const file = images[0]
    step.value = 'loading'
    const reader = new FileReader()
    reader.onload = () => {
      imageDataUrl.value = reader.result as string
    }
    reader.readAsDataURL(file)
    recognize(file)
    return
  }

  // 仅文字 → 走文字 AI 解析
  if (text) {
    voiceTranscript.value = text
    step.value = 'voice-processing'
    try {
      const parsed = await voiceParseWithAi(text)
      recognizeResult.value = parsed
      step.value = 'result'
    } catch (err: any) {
      errorMsg.value = err.message || '解析失败'
      step.value = 'error'
    }
  }
}

function handleConfirm(data: { title: string; content: string; eventDate: string; type: string }) {
  emit('confirm', { ...data, imageUrl: imageDataUrl.value })
  handleClose()
}

function handleWeightConfirm() {
  if (!canSaveWeight.value) return
  const pw = directPetWeight.value!
  const tw = totalWeight.value
  const hw = humanWeight.value
  const hasCalc = tw != null && hw != null && tw > hw
  emit('confirm', {
    title: '体重记录',
    content: hasCalc
      ? `宠物体重 ${pw}kg（抱宠 ${tw}kg - 人 ${hw}kg）`
      : `宠物体重 ${pw}kg`,
    eventDate: weightDate.value,
    type: 'growth',
    imageUrl: '',
    aiRawData: hasCalc
      ? { petWeight: pw, totalWeight: tw, humanWeight: hw }
      : { petWeight: pw }
  })
  handleClose()
}

function handleDewormConfirm() {
  const f = dewormForm.value
  if (!f.subType) return
  const typeLabel = dewormTypeOptions.find(o => o.value === f.subType)?.label || f.subType
  const parts = [typeLabel]
  if (f.brand) parts.push(f.brand)
  if (f.note) parts.push(f.note)
  emit('confirm', {
    title: `${typeLabel}记录`,
    content: parts.join('，'),
    eventDate: f.date,
    type: 'medical',
    imageUrl: '',
    aiRawData: { quickType: 'deworm', ...f }
  })
  handleClose()
}

function handleFeedingConfirm() {
  const f = feedingForm.value
  if (!f.meal || !f.appetite) return
  const mealLabel = mealOptions.find(o => o.value === f.meal)?.label || f.meal
  const appetiteLabel = appetiteOptions.find(o => o.value === f.appetite)?.label || f.appetite
  const foodLabel = foodTypeOptions.find(o => o.value === f.foodType)?.label || ''
  const parts = [mealLabel, appetiteLabel]
  if (foodLabel) parts.push(foodLabel)
  if (f.note) parts.push(f.note)
  emit('confirm', {
    title: '喂食记录',
    content: parts.join('，'),
    eventDate: f.date,
    type: 'diet',
    imageUrl: '',
    aiRawData: { quickType: 'feeding', ...f }
  })
  handleClose()
}

function handlePoopConfirm() {
  const f = poopForm.value
  if (!f.poopType || !f.poopStatus) return
  const typeLabel = poopTypeOptions.find(o => o.value === f.poopType)?.label || f.poopType
  const statusLabel = poopStatusOptions.find(o => o.value === f.poopStatus)?.label || f.poopStatus
  const parts = [typeLabel, statusLabel]
  if (f.note) parts.push(f.note)
  emit('confirm', {
    title: '排泄记录',
    content: parts.join('，'),
    eventDate: f.date,
    type: 'growth',
    imageUrl: '',
    aiRawData: { quickType: 'poop', ...f }
  })
  handleClose()
}

function handleGroomingConfirm() {
  const f = groomingForm.value
  if (!f.item) return
  const itemLabel = groomingItemOptions.find(o => o.value === f.item)?.label || f.item
  const placeLabel = groomingPlaceOptions.find(o => o.value === f.place)?.label || ''
  const parts = [itemLabel]
  if (placeLabel) parts.push(placeLabel)
  if (f.cost != null && f.cost > 0) parts.push(`¥${f.cost}`)
  emit('confirm', {
    title: '美容记录',
    content: parts.join('，'),
    eventDate: f.date,
    type: 'grooming',
    imageUrl: '',
    aiRawData: { quickType: 'grooming', ...f }
  })
  handleClose()
}

function handleWaterConfirm() {
  const f = waterForm.value
  if (!f.level) return
  const levelLabel = waterLevelOptions.find(o => o.value === f.level)?.label || f.level
  const parts = [`饮水量${levelLabel}`]
  if (f.amount != null && f.amount > 0) parts.push(`约${f.amount}ml`)
  if (f.note) parts.push(f.note)
  emit('confirm', {
    title: '饮水记录',
    content: parts.join('，'),
    eventDate: f.date,
    type: 'diet',
    imageUrl: '',
    aiRawData: { quickType: 'water', ...f }
  })
  handleClose()
}

/** AiInputBar: 开始录音 */
function handleStartRecording() {
  voiceReset()
  voiceRecognize()
}

/** AiInputBar: 停止录音 */
function handleStopRecording() {
  voiceStopListening()
}
</script>

<style lang="scss" scoped>
.sheet-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  animation: fadeIn 0.2s ease;
}

.sheet {
  width: 100%;
  max-width: 430px;
  background-color: var(--card);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  transform: translateY(100%);
  transition: transform var(--transition-slow);

  &--visible {
    transform: translateY(0);
  }

  &__handle {
    display: flex;
    justify-content: center;
    padding: var(--space-3) 0;
  }

  &__bar {
    width: 40px;
    height: 4px;
    border-radius: var(--radius-full);
    background-color: var(--muted);
  }

  &__body {
    padding: 0 var(--space-5) var(--space-6);
    padding-bottom: calc(var(--space-6) + env(safe-area-inset-bottom));

    &--center {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-3);
      padding-top: var(--space-6);
      padding-bottom: calc(var(--space-8) + env(safe-area-inset-bottom));
    }
  }

  &__title {
    font-size: var(--text-lg);
    font-weight: var(--font-semibold);
    color: var(--foreground);
    margin-bottom: var(--space-4);
    display: block;
  }

  &__quick-entries {
    margin-top: var(--space-4);
  }

  &__quick-label {
    font-size: var(--text-sm);
    color: var(--muted-foreground);
    display: block;
    margin-bottom: var(--space-2);
  }

  &__quick-list {
    display: flex;
    gap: var(--space-2);
    flex-wrap: wrap;
  }

  &__quick-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    border: 1px solid var(--border);
    border-radius: var(--radius-full);
    cursor: pointer;
    transition: background-color var(--transition-fast);

    &:hover {
      background-color: var(--muted);
    }
  }

  &__quick-item-icon {
    width: 16px;
    height: 16px;
    color: var(--foreground);
    flex-shrink: 0;
  }

  &__quick-item-text {
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    color: var(--foreground);
  }

  &__calc-section {
    margin-bottom: var(--space-4);
  }

  &__calc-label {
    font-size: var(--text-sm);
    color: var(--muted-foreground);
    display: block;
    margin-bottom: var(--space-2);
  }

  &__calc-row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  &__calc-input-wrap {
    flex: 1;
    position: relative;
  }

  &__calc-input {
    width: 100%;
    height: 44px;
    padding: 0 36px 0 var(--space-3);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    font-size: var(--text-base);
    background: transparent;
    color: var(--foreground);
    outline: none;
    box-sizing: border-box;

    &:focus {
      border-color: var(--ring);
      box-shadow: 0 0 0 2px rgba(77, 182, 172, 0.15);
    }

    &::placeholder {
      color: var(--muted-foreground);
      opacity: 0.6;
      font-size: var(--text-sm);
    }
  }

  &__calc-unit {
    position: absolute;
    right: var(--space-3);
    top: 50%;
    transform: translateY(-50%);
    font-size: var(--text-sm);
    color: var(--muted-foreground);
    pointer-events: none;
  }

  &__calc-minus {
    font-size: 20px;
    font-weight: var(--font-bold);
    color: var(--muted-foreground);
    flex-shrink: 0;
    line-height: 1;
  }

  &__calc-error {
    font-size: var(--text-xs);
    color: #E65100;
    margin-top: var(--space-1);
  }

  &__weight-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  &__weight-field {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  &__weight-label {
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    color: var(--muted-foreground);
  }

  &__weight-input {
    height: 44px;
    padding: 0 var(--space-4);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    font-size: var(--text-base);
    background: transparent;
    color: var(--foreground);
    outline: none;
    width: 100%;
    box-sizing: border-box;

    &--main {
      height: 52px;
      font-size: var(--text-lg);
      font-weight: var(--font-medium);
    }

    &:focus {
      border-color: var(--ring);
      box-shadow: 0 0 0 2px rgba(77, 182, 172, 0.15);
    }

    &::placeholder {
      color: var(--muted-foreground);
      opacity: 0.6;
    }
  }



  &__weight-save {
    width: 100%;
    height: 44px;
    margin-top: var(--space-3);
    border: none;
    border-radius: var(--radius);
    background-color: var(--primary);
    color: var(--primary-foreground);
    font-size: var(--text-base);
    font-weight: var(--font-medium);
    cursor: pointer;
    transition: all var(--transition-fast);

    &:hover:not(:disabled) {
      background-color: var(--primary-hover);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  // 通用快捷表单样式
  &__form-field {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin-bottom: var(--space-3);
  }

  &__form-label {
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    color: var(--muted-foreground);
  }

  &__form-input {
    height: 44px;
    padding: 0 var(--space-4);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    font-size: var(--text-base);
    background: transparent;
    color: var(--foreground);
    outline: none;
    width: 100%;
    box-sizing: border-box;

    &--main {
      height: 52px;
      font-size: var(--text-lg);
      font-weight: var(--font-medium);
    }

    &:focus {
      border-color: var(--ring);
      box-shadow: 0 0 0 2px rgba(77, 182, 172, 0.15);
    }

    &::placeholder {
      color: var(--muted-foreground);
      opacity: 0.6;
    }
  }

  &__chip-group {
    display: flex;
    gap: var(--space-2);
    flex-wrap: wrap;
  }

  &__chip {
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    font-size: var(--text-sm);
    color: var(--foreground);
    cursor: pointer;
    transition: all var(--transition-fast);
    user-select: none;

    &:hover {
      background-color: var(--muted);
    }

    &--active {
      background-color: var(--primary);
      color: var(--primary-foreground);
      border-color: var(--primary);
    }
  }

  &__form-save {
    width: 100%;
    height: 44px;
    margin-top: var(--space-3);
    border: none;
    border-radius: var(--radius);
    background-color: var(--primary);
    color: var(--primary-foreground);
    font-size: var(--text-base);
    font-weight: var(--font-medium);
    cursor: pointer;
    transition: all var(--transition-fast);

    &:hover:not(:disabled) {
      background-color: var(--primary-hover);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  &__inline-input {
    position: relative;
    display: flex;
    align-items: center;

    .sheet__form-input {
      padding-right: 40px;
    }
  }

  &__inline-unit {
    position: absolute;
    right: var(--space-3);
    font-size: var(--text-sm);
    color: var(--muted-foreground);
    pointer-events: none;
  }

  &__spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--border);
    border-top-color: var(--primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  &__loading-text {
    font-size: var(--text-lg);
    font-weight: var(--font-medium);
    color: var(--foreground);
  }

  &__loading-hint {
    font-size: var(--text-sm);
    color: var(--muted-foreground);
  }

  &__error-icon {
    width: 32px;
    height: 32px;
    color: var(--muted-foreground);
  }

  &__error-text {
    font-size: var(--text-base);
    color: var(--foreground);
    text-align: center;
    max-width: 280px;
    word-break: break-word;
  }

  &__voice-transcript {
    font-size: var(--text-base);
    color: var(--foreground);
    text-align: center;
    max-width: 280px;
    word-break: break-word;
    padding: var(--space-2) var(--space-3);
    background-color: var(--muted);
    border-radius: var(--radius);
    line-height: var(--leading-relaxed);
  }
}

@keyframes voicePulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}
</style>
