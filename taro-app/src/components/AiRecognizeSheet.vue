<template>
  <view 
    v-if="visible" 
    class="sheet-mask" 
    @tap.self="handleClose"
  >
    <view class="sheet-mask__bg" catchMove @tap="handleClose" />
    <view 
      :class="['sheet', show ? 'sheet--visible' : '']"
    >
      <view class="sheet__handle">
        <view class="sheet__bar" />
      </view>

      <!-- Step 1: 输入 -->
      <view v-if="step === 'choose'" class="sheet__body">
        <text class="sheet__title">添加记录</text>
        
        <!-- AI 输入区域 -->
        <view class="sheet__ai-input">
          <textarea
            v-if="!isRecording"
            v-model="inputText"
            class="sheet__textarea"
            placeholder="今天带毛孩子做了什么？"
            :maxlength="500"
            auto-height
          />
          <view v-else class="sheet__transcript">
            <text v-if="voiceTranscript" class="sheet__transcript-text">{{ voiceTranscript }}</text>
            <text v-else class="sheet__transcript-placeholder">正在聆听...</text>
            <view class="sheet__recording-dot" />
          </view>
          <view class="sheet__ai-toolbar">
            <view class="sheet__toolbar-left">
              <view class="sheet__ai-img-btn" @tap="chooseImage">
                <image :src="ICONS.image" class="sheet__ai-icon" mode="aspectFit" />
                <text class="sheet__ai-img-text">图片识别</text>
              </view>
              <!-- 语音按钮 -->
              <view 
                class="sheet__ai-mic" 
                :class="{ 'sheet__ai-mic--active': isRecording }"
                @tap="toggleRecording"
              >
                <image :src="ICONS.mic" class="sheet__ai-icon" mode="aspectFit" />
              </view>
            </view>
            <!-- 发送按钮 -->
            <view 
              class="sheet__ai-send" 
              :class="{ 'sheet__ai-send--active': canSubmit || isRecording }" 
              @tap="handleAiAction"
            >
              <image :src="ICONS.send" class="sheet__ai-icon" mode="aspectFit" />
            </view>
          </view>
        </view>

        <!-- 快捷记录 -->
        <view class="sheet__quick-entries">
          <text class="sheet__quick-label">快捷记录</text>
          <view class="sheet__quick-list">
            <view class="sheet__quick-item" @tap="step = 'weight'">
              <image :src="ICONS.scale" class="sheet__quick-icon" mode="aspectFit" />
              <text class="sheet__quick-item-text">体重</text>
            </view>
            <view class="sheet__quick-item" @tap="step = 'deworm'">
              <image :src="ICONS.syringe" class="sheet__quick-icon" mode="aspectFit" />
              <text class="sheet__quick-item-text">驱虫/疫苗</text>
            </view>
            <view class="sheet__quick-item" @tap="step = 'feeding'">
              <image :src="ICONS.utensils" class="sheet__quick-icon" mode="aspectFit" />
              <text class="sheet__quick-item-text">喂食</text>
            </view>
            <view class="sheet__quick-item" @tap="step = 'poop'">
              <image :src="ICONS.activity" class="sheet__quick-icon" mode="aspectFit" />
              <text class="sheet__quick-item-text">排泄</text>
            </view>
            <view class="sheet__quick-item" @tap="step = 'grooming'">
              <image :src="ICONS.sparkles" class="sheet__quick-icon" mode="aspectFit" />
              <text class="sheet__quick-item-text">美容</text>
            </view>
            <view class="sheet__quick-item" @tap="step = 'water'">
              <image :src="ICONS.droplets" class="sheet__quick-icon" mode="aspectFit" />
              <text class="sheet__quick-item-text">饮水</text>
            </view>
          </view>
        </view>
      </view>

      <!-- Step: 体重记录 -->
      <view v-else-if="step === 'weight'" class="sheet__body">
        <text class="sheet__title">记录体重</text>

        <!-- 辅助计算 -->
        <view class="sheet__calc-section">
          <text class="sheet__calc-label">辅助计算（选填）</text>
          <view class="sheet__calc-row">
            <view class="sheet__calc-input-wrap">
              <input
                type="digit"
                class="sheet__calc-input"
                v-model="totalWeight"
                placeholder="抱宠物"
              />
              <text class="sheet__calc-unit">kg</text>
            </view>
            <text class="sheet__calc-minus">−</text>
            <view class="sheet__calc-input-wrap">
              <input
                type="digit"
                class="sheet__calc-input"
                v-model="humanWeight"
                placeholder="人单独"
              />
              <text class="sheet__calc-unit">kg</text>
            </view>
          </view>
        </view>

        <!-- 宠物体重 -->
        <view class="sheet__weight-field">
          <text class="sheet__weight-label">宠物体重 (kg)</text>
          <input
            type="digit"
            class="sheet__weight-input sheet__weight-input--main"
            v-model="directPetWeight"
            placeholder="直接输入或由上方自动计算"
          />
        </view>

        <!-- 日期选择 -->
        <view class="sheet__weight-field">
          <text class="sheet__weight-label">日期</text>
          <picker mode="date" :value="weightDate" @change="e => weightDate = e.detail.value">
            <view class="sheet__weight-input">{{ weightDate }}</view>
          </picker>
        </view>

        <!-- 保存按钮 -->
        <button
          class="sheet__weight-save"
          :disabled="!canSaveWeight"
          @tap="handleWeightConfirm"
        >
          保存记录
        </button>
      </view>

      <!-- Step: 驱虫/疫苗 -->
      <view v-else-if="step === 'deworm'" class="sheet__body">
        <text class="sheet__title">驱虫 / 疫苗</text>
        <view class="sheet__form-field">
          <text class="sheet__form-label">类型</text>
          <view class="sheet__chip-group">
            <view
              v-for="opt in dewormTypeOptions"
              :key="opt.value"
              :class="['sheet__chip', dewormForm.subType === opt.value ? 'sheet__chip--active' : '']"
              @tap="dewormForm.subType = opt.value"
            >{{ opt.label }}</view>
          </view>
        </view>
        <view class="sheet__form-field">
          <text class="sheet__form-label">品牌/名称（选填）</text>
          <input class="sheet__form-input" v-model="dewormForm.brand" placeholder="如：大宠爱、妙三多" />
        </view>
        <view class="sheet__form-field">
          <text class="sheet__form-label">日期</text>
          <picker mode="date" :value="dewormForm.date" @change="e => dewormForm.date = e.detail.value">
            <view class="sheet__form-input">{{ dewormForm.date }}</view>
          </picker>
        </view>
        <view class="sheet__form-field">
          <text class="sheet__form-label">备注（选填）</text>
          <input class="sheet__form-input" v-model="dewormForm.note" placeholder="如：体重5kg用半支" />
        </view>
        <button class="sheet__form-save" :disabled="!dewormForm.subType" @tap="handleDewormConfirm">保存记录</button>
      </view>

      <!-- Step: 喂食 -->
      <view v-else-if="step === 'feeding'" class="sheet__body">
        <text class="sheet__title">喂食记录</text>
        <view class="sheet__form-field">
          <text class="sheet__form-label">餐次</text>
          <view class="sheet__chip-group">
            <view
              v-for="opt in mealOptions"
              :key="opt.value"
              :class="['sheet__chip', feedingForm.meal === opt.value ? 'sheet__chip--active' : '']"
              @tap="feedingForm.meal = opt.value"
            >{{ opt.label }}</view>
          </view>
        </view>
        <view class="sheet__form-field">
          <text class="sheet__form-label">食量</text>
          <view class="sheet__chip-group">
            <view
              v-for="opt in appetiteOptions"
              :key="opt.value"
              :class="['sheet__chip', feedingForm.appetite === opt.value ? 'sheet__chip--active' : '']"
              @tap="feedingForm.appetite = opt.value"
            >{{ opt.label }}</view>
          </view>
        </view>
        <view class="sheet__form-field">
          <text class="sheet__form-label">喂的什么</text>
          <view class="sheet__chip-group">
            <view
              v-for="opt in foodTypeOptions"
              :key="opt.value"
              :class="['sheet__chip', feedingForm.foodType === opt.value ? 'sheet__chip--active' : '']"
              @tap="feedingForm.foodType = opt.value"
            >{{ opt.label }}</view>
          </view>
        </view>
        <view class="sheet__form-field">
          <text class="sheet__form-label">日期</text>
          <picker mode="date" :value="feedingForm.date" @change="e => feedingForm.date = e.detail.value">
            <view class="sheet__form-input">{{ feedingForm.date }}</view>
          </picker>
        </view>
        <view class="sheet__form-field">
          <text class="sheet__form-label">备注（选填）</text>
          <input class="sheet__form-input" v-model="feedingForm.note" placeholder="如：换了新粮" />
        </view>
        <button class="sheet__form-save" :disabled="!feedingForm.meal || !feedingForm.appetite" @tap="handleFeedingConfirm">保存记录</button>
      </view>

      <!-- Step: 排泄 -->
      <view v-else-if="step === 'poop'" class="sheet__body">
        <text class="sheet__title">排泄记录</text>
        <view class="sheet__form-field">
          <text class="sheet__form-label">类型</text>
          <view class="sheet__chip-group">
            <view
              v-for="opt in poopTypeOptions"
              :key="opt.value"
              :class="['sheet__chip', poopForm.poopType === opt.value ? 'sheet__chip--active' : '']"
              @tap="poopForm.poopType = opt.value"
            >{{ opt.label }}</view>
          </view>
        </view>
        <view class="sheet__form-field">
          <text class="sheet__form-label">状态</text>
          <view class="sheet__chip-group">
            <view
              v-for="opt in poopStatusOptions"
              :key="opt.value"
              :class="['sheet__chip', poopForm.poopStatus === opt.value ? 'sheet__chip--active' : '']"
              @tap="poopForm.poopStatus = opt.value"
            >{{ opt.label }}</view>
          </view>
        </view>
        <view class="sheet__form-field">
          <text class="sheet__form-label">日期</text>
          <picker mode="date" :value="poopForm.date" @change="e => poopForm.date = e.detail.value">
            <view class="sheet__form-input">{{ poopForm.date }}</view>
          </picker>
        </view>
        <view class="sheet__form-field">
          <text class="sheet__form-label">备注（选填）</text>
          <input class="sheet__form-input" v-model="poopForm.note" placeholder="如：颜色偏黑" />
        </view>
        <button class="sheet__form-save" :disabled="!poopForm.poopType || !poopForm.poopStatus" @tap="handlePoopConfirm">保存记录</button>
      </view>

      <!-- Step: 美容 -->
      <view v-else-if="step === 'grooming'" class="sheet__body">
        <text class="sheet__title">美容记录</text>
        <view class="sheet__form-field">
          <text class="sheet__form-label">项目</text>
          <view class="sheet__chip-group">
            <view
              v-for="opt in groomingItemOptions"
              :key="opt.value"
              :class="['sheet__chip', groomingForm.item === opt.value ? 'sheet__chip--active' : '']"
              @tap="groomingForm.item = opt.value"
            >{{ opt.label }}</view>
          </view>
        </view>
        <view class="sheet__form-field">
          <text class="sheet__form-label">地点</text>
          <view class="sheet__chip-group">
            <view
              v-for="opt in groomingPlaceOptions"
              :key="opt.value"
              :class="['sheet__chip', groomingForm.place === opt.value ? 'sheet__chip--active' : '']"
              @tap="groomingForm.place = opt.value"
            >{{ opt.label }}</view>
          </view>
        </view>
        <view class="sheet__form-field">
          <text class="sheet__form-label">花费（选填）</text>
          <view class="sheet__inline-input">
            <input type="digit" class="sheet__form-input" v-model="groomingForm.cost" placeholder="如：200" />
            <text class="sheet__inline-unit">元</text>
          </view>
        </view>
        <view class="sheet__form-field">
          <text class="sheet__form-label">日期</text>
          <picker mode="date" :value="groomingForm.date" @change="e => groomingForm.date = e.detail.value">
            <view class="sheet__form-input">{{ groomingForm.date }}</view>
          </picker>
        </view>
        <button class="sheet__form-save" :disabled="!groomingForm.item" @tap="handleGroomingConfirm">保存记录</button>
      </view>

      <!-- Step: 饮水 -->
      <view v-else-if="step === 'water'" class="sheet__body">
        <text class="sheet__title">饮水记录</text>
        <view class="sheet__form-field">
          <text class="sheet__form-label">饮水量</text>
          <view class="sheet__chip-group">
            <view
              v-for="opt in waterLevelOptions"
              :key="opt.value"
              :class="['sheet__chip', waterForm.level === opt.value ? 'sheet__chip--active' : '']"
              @tap="waterForm.level = opt.value"
            >{{ opt.label }}</view>
          </view>
        </view>
        <view class="sheet__form-field">
          <text class="sheet__form-label">具体量（选填）</text>
          <view class="sheet__inline-input">
            <input type="digit" class="sheet__form-input" v-model="waterForm.amount" placeholder="如：200" />
            <text class="sheet__inline-unit">ml</text>
          </view>
        </view>
        <view class="sheet__form-field">
          <text class="sheet__form-label">日期</text>
          <picker mode="date" :value="waterForm.date" @change="e => waterForm.date = e.detail.value">
            <view class="sheet__form-input">{{ waterForm.date }}</view>
          </picker>
        </view>
        <view class="sheet__form-field">
          <text class="sheet__form-label">备注（选填）</text>
          <input class="sheet__form-input" v-model="waterForm.note" placeholder="如：换了饮水机" />
        </view>
        <button class="sheet__form-save" :disabled="!waterForm.level" @tap="handleWaterConfirm">保存记录</button>
      </view>

      <!-- Step: AI 识别中 -->
      <view v-else-if="step === 'loading'" class="sheet__body sheet__body--center">
        <view class="sheet__spinner" />
        <text class="sheet__loading-text">AI 正在识别...</text>
        <text class="sheet__loading-hint">正在分析内容</text>
      </view>

      <!-- Step: 语音/文字 AI 处理中 -->
      <view v-else-if="step === 'voice-processing'" class="sheet__body sheet__body--center">
        <view class="sheet__spinner" />
        <text class="sheet__loading-text">AI 正在分析...</text>
        <text v-if="voiceTranscript" class="sheet__voice-transcript">「{{ voiceTranscript }}」</text>
        <text class="sheet__loading-hint">正在理解输入内容</text>
      </view>

      <!-- Step: 确认结果 -->
      <view v-else-if="step === 'result'" class="sheet__body">
        <ConfirmCard
          :result="recognizeResult!"
          :imageUrl="imageFilePath"
          @confirm="handleConfirm"
          @cancel="handleClose"
        />
      </view>

      <!-- Step: 批量识别中 -->
      <view v-else-if="step === 'batch-loading'" class="sheet__body sheet__body--center">
        <view class="sheet__spinner" />
        <text class="sheet__loading-text">AI 正在识别...</text>
        <text class="sheet__loading-hint">{{ batchProgress.current }} / {{ batchProgress.total }} 张图片</text>
        <view class="sheet__batch-progress">
          <view 
            class="sheet__batch-progress-bar" 
            :style="{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }"
          />
        </view>
      </view>

      <!-- Step: 批量确认结果 -->
      <view v-else-if="step === 'batch-result'" class="sheet__body sheet__body--batch">
        <BatchConfirmCard
          :items="batchItems"
          @confirm="handleBatchConfirm"
          @cancel="handleClose"
          @remove="removeBatchItem"
          @update="handleBatchUpdate"
        />
      </view>

      <!-- Error -->
      <view v-else-if="step === 'error'" class="sheet__body sheet__body--center">
        <image class="sheet__error-icon" src="/static/icons/alert-triangle.svg" mode="aspectFit" />
        <text class="sheet__error-text">{{ errorMsg || '识别失败，请重试' }}</text>
        <SButton variant="outline" size="sm" @tap="step = 'choose'">重新选择</SButton>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import Taro from '@tarojs/taro'
import type { RecognizeResult } from '@/types/index'
import { useAiRecognize, type BatchRecognizeItem } from '@/composables/useAiRecognize'
import { useVoiceRecognize } from '@/composables/useVoiceRecognize'
import { useAuth } from '@/composables/useAuth'
import ConfirmCard from './ConfirmCard.vue'
import BatchConfirmCard from './BatchConfirmCard.vue'
import SButton from './SButton.vue'

// 使用静态文件路径引用图标
const ICONS = {
  image: '/static/icons/image.svg',
  send: '/static/icons/send.svg',
  scale: '/static/icons/scale.svg',
  syringe: '/static/icons/syringe.svg',
  utensils: '/static/icons/utensils.svg',
  sparkles: '/static/icons/sparkles.svg',
  activity: '/static/icons/activity.svg',
  droplets: '/static/icons/droplets.svg',
  mic: '/static/icons/mic.svg',
}

const props = defineProps<{
  visible: boolean
  initialMode?: 'camera' | 'album' | 'none'
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  confirm: [data: { title: string; content: string; eventDate: string; type: string; imageUrl: string; aiRawData?: Record<string, unknown> }]
  'confirm-batch': [data: Array<{ title: string; content: string; eventDate: string; type: string; imageUrl: string }>]
}>()

type Step = 'choose' | 'loading' | 'result' | 'error' | 'weight' | 'deworm' | 'feeding' | 'poop' | 'grooming' | 'water' | 'voice-processing' | 'batch-loading' | 'batch-result'
const step = ref<Step>('choose')
const show = ref(false)
const recognizeResult = ref<RecognizeResult | null>(null)
const errorMsg = ref('')
const imageFilePath = ref('')
const inputText = ref('')
const isRecording = ref(false)
const voiceTranscript = ref('')

// 体重记录
const directPetWeight = ref('')
const totalWeight = ref('')
const humanWeight = ref('')
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
const groomingForm = ref({ item: '', place: '', cost: '', date: getTodayStr() })

// 饮水
const waterLevelOptions = [
  { label: '很少', value: 'little' },
  { label: '正常', value: 'normal' },
  { label: '较多', value: 'much' }
]
const waterForm = ref({ level: '', amount: '', date: getTodayStr(), note: '' })

function getTodayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const canSubmit = computed(() => inputText.value.trim().length > 0 || voiceTranscript.value.length > 0)

const canSaveWeight = computed(() => {
  const pw = parseFloat(directPetWeight.value)
  return !isNaN(pw) && pw > 0
})

// 辅助计算自动回填
watch([totalWeight, humanWeight], ([tw, hw]) => {
  const total = parseFloat(tw)
  const human = parseFloat(hw)
  if (!isNaN(total) && !isNaN(human) && total > human) {
    directPetWeight.value = String(Math.round((total - human) * 10) / 10)
  }
})

const { status, result, multiResults, error, recognize, reset, batchItems, batchProgress, recognizeBatch, removeBatchItem, updateBatchItem } = useAiRecognize()
const { parseWithAi, reset: voiceReset } = useVoiceRecognize()
const { ensureCloudAuth } = useAuth()

// 微信录音管理器
let recorderManager: Taro.RecorderManager | null = null

watch(
  () => props.visible,
  (val) => {
    if (val) {
      step.value = 'choose'
      recognizeResult.value = null
      errorMsg.value = ''
      imageFilePath.value = ''
      inputText.value = ''
      voiceTranscript.value = ''
      isRecording.value = false
      directPetWeight.value = ''
      totalWeight.value = ''
      humanWeight.value = ''
      weightDate.value = getTodayStr()
      dewormForm.value = { subType: '', brand: '', date: getTodayStr(), note: '' }
      feedingForm.value = { meal: '', appetite: '', foodType: '', date: getTodayStr(), note: '' }
      poopForm.value = { poopType: '', poopStatus: '', date: getTodayStr(), note: '' }
      groomingForm.value = { item: '', place: '', cost: '', date: getTodayStr() }
      waterForm.value = { level: '', amount: '', date: getTodayStr(), note: '' }
      reset()
      voiceReset()
      setTimeout(() => { 
        show.value = true
        // 根据 initialMode 自动触发拍照或选择相册
        if (props.initialMode === 'camera') {
          chooseImageWithSource('camera')
        } else if (props.initialMode === 'album') {
          chooseImageWithSource('album')
        }
      }, 50)
    } else {
      show.value = false
      stopRecording()
    }
  }
)

// 监听 AI 识别状态
watch(status, (val) => {
  // 批量识别时的状态处理
  if (step.value === 'batch-loading') {
    if (val === 'done') {
      step.value = 'batch-result'
    } else if (val === 'error') {
      errorMsg.value = error.value
      step.value = 'error'
    }
    return
  }
  
  // 单张识别的状态处理
  if (val === 'uploading' || val === 'recognizing') {
    step.value = 'loading'
  } else if (val === 'done') {
    if (multiResults.value.length > 0) {
      // 单张图片识别出多条记录 → 转为批量确认
      // 将多条结果构造为 batchItems 格式，共用同一张图片
      batchItems.value = multiResults.value.map((r, i) => ({
        filePath: imageFilePath.value,
        result: r,
        error: '',
        status: 'done' as const
      }))
      step.value = 'batch-result'
    } else if (result.value) {
      recognizeResult.value = result.value
      step.value = 'result'
    }
  } else if (val === 'error') {
    errorMsg.value = error.value
    step.value = 'error'
  }
})

function handleClose() {
  stopRecording()
  show.value = false
  setTimeout(() => {
    emit('update:visible', false)
  }, 300)
}



// 选择图片（支持指定来源）
function chooseImageWithSource(source: 'album' | 'camera' | 'both' = 'both') {
  const sourceType = source === 'both' ? ['album', 'camera'] : [source]
  // 相机只能单张，相册支持多选
  const maxCount = source === 'camera' ? 1 : 9
  
  // 使用 chooseMedia API，支持更好的原图选择
  Taro.chooseMedia({
    count: maxCount,
    mediaType: ['image'],
    sourceType: sourceType as ('album' | 'camera')[],
    sizeType: ['original'], // 强制使用原图，保留 EXIF 信息
    success: (res) => {
      const filePaths = res.tempFiles.map(f => f.tempFilePath)
      console.log('[图片] 选择成功:', filePaths, '数量:', filePaths.length)
      
      if (filePaths.length === 1) {
        // 单张图片：使用原有流程
        imageFilePath.value = filePaths[0]
        step.value = 'loading'
        recognize(filePaths[0])
      } else {
        // 多张图片：使用批量识别
        step.value = 'batch-loading'
        recognizeBatch(filePaths)
      }
    },
    fail: (err) => {
      // chooseMedia 失败时，降级使用 chooseImage
      console.warn('[图片] chooseMedia 失败，降级使用 chooseImage:', err)
      Taro.chooseImage({
        count: maxCount,
        sizeType: ['original', 'compressed'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          const filePaths = res.tempFilePaths
          
          if (filePaths.length === 1) {
            imageFilePath.value = filePaths[0]
            step.value = 'loading'
            recognize(filePaths[0])
          } else {
            step.value = 'batch-loading'
            recognizeBatch(filePaths)
          }
        },
        fail: (err2) => {
          console.warn('[图片] 选择失败或用户取消', err2)
        }
      })
    }
  })
}

// 兼容旧的调用方式
function chooseImage() {
  chooseImageWithSource('both')
}

// 语音录制
function toggleRecording() {
  if (isRecording.value) {
    stopRecording()
  } else {
    startRecording()
  }
}

function startRecording() {
  if (!recorderManager) {
    recorderManager = Taro.getRecorderManager()

    recorderManager.onStart(() => {
      console.log('[语音] 开始录音')
      isRecording.value = true
      voiceTranscript.value = ''
    })

    recorderManager.onStop((res) => {
      console.log('[语音] 录音结束', res)
      isRecording.value = false

      if (res.tempFilePath) {
        recognizeVoice(res.tempFilePath)
      }
    })

    recorderManager.onError((err) => {
      console.error('[语音] 录音错误', err)
      isRecording.value = false
      Taro.showToast({ title: '录音失败，请重试', icon: 'none' })
    })
  }

  recorderManager.start({
    duration: 60000,
    sampleRate: 16000,
    numberOfChannels: 1,
    encodeBitRate: 48000,
    format: 'mp3',
  })
}

function stopRecording() {
  if (recorderManager && isRecording.value) {
    recorderManager.stop()
  }
}

// 语音识别 - 上传到云存储后调云函数 ASR
async function recognizeVoice(filePath: string) {
  const cloudPath = `voice/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.mp3`
  let fileID = ''

  try {
    Taro.showLoading({ title: '识别中...', mask: true })

    await ensureCloudAuth()

    const uploadRes = await Taro.cloud.uploadFile({
      cloudPath,
      filePath
    })
    fileID = uploadRes.fileID

    const res = await Taro.cloud.callFunction({
      name: 'aiRecognize',
      data: {
        action: 'transcribeVoice',
        fileID
      }
    }) as { result?: { success?: boolean; data?: { text?: string }; error?: string } }

    if (!res.result?.success) {
      const backendError = res.result?.error || '语音识别失败'
      throw new Error(backendError)
    }

    const text = (res.result.data?.text || '').trim()
    if (!text) {
      throw new Error('未识别到语音内容')
    }

    voiceTranscript.value = text
    inputText.value = text
    Taro.showToast({ title: '识别成功', icon: 'success' })
  } catch (err: any) {
    console.error('[语音] 云函数识别失败', err)
    Taro.showToast({ title: err?.message || '语音识别失败', icon: 'none' })
  } finally {
    Taro.hideLoading()

    if (fileID) {
      Taro.cloud.deleteFile({ fileList: [fileID] }).catch(() => {})
    }
  }
}

// AI 输入动作（发送或停止录音）
async function handleAiAction() {
  if (isRecording.value) {
    stopRecording()
    return
  }
  
  const text = inputText.value.trim() || voiceTranscript.value.trim()
  if (!text) return

  step.value = 'voice-processing'
  voiceTranscript.value = text
  
  try {
    const parsed = await parseWithAi(text)
    recognizeResult.value = parsed
    step.value = 'result'
  } catch (err: any) {
    errorMsg.value = err.message || '解析失败'
    step.value = 'error'
  }
}

function handleConfirm(data: { title: string; content: string; eventDate: string; type: string }) {
  emit('confirm', { ...data, imageUrl: imageFilePath.value })
  handleClose()
}

function handleBatchConfirm(data: Array<{ title: string; content: string; eventDate: string; type: string; imageUrl: string }>) {
  emit('confirm-batch', data)
  handleClose()
}

function handleBatchUpdate(index: number, data: { title?: string; eventDate?: string }) {
  updateBatchItem(index, data)
}

function handleWeightConfirm() {
  if (!canSaveWeight.value) return
  const pw = parseFloat(directPetWeight.value)
  const tw = parseFloat(totalWeight.value)
  const hw = parseFloat(humanWeight.value)
  const hasCalc = !isNaN(tw) && !isNaN(hw) && tw > hw
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
  const cost = parseFloat(f.cost)
  if (!isNaN(cost) && cost > 0) parts.push(`¥${cost}`)
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
  const amount = parseFloat(f.amount)
  if (!isNaN(amount) && amount > 0) parts.push(`约${amount}ml`)
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

// 暴露给父组件调用
defineExpose({ show: () => { emit('update:visible', true) } })
</script>

<style lang="scss">
.sheet-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  height: 100vh;
  z-index: 10000;
  display: flex;
  align-items: flex-end;
  justify-content: center;

  &__bg {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
  }
}

.sheet {
  width: 100%;
  height: 80vh;
  background-color: #FFFFFF;
  border-radius: 48rpx 48rpx 0 0;
  transform: translateY(100%);
  transition: transform 0.3s ease;
  overflow: hidden;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 1;

  &--visible {
    transform: translateY(0);
  }

  &__handle {
    display: flex;
    justify-content: center;
    padding: 24px 0;
    flex-shrink: 0;
  }

  &__bar {
    width: 80px;
    height: 8px;
    border-radius: 9999px;
    background-color: #E7E5E4;
  }

  &__body {
    padding: 16rpx 40px 60px;
    padding-bottom: calc(60px + env(safe-area-inset-bottom));
    box-sizing: border-box;
    width: 100%;
    flex: 1;
    min-height: 0;
    overflow: visible;

    &--center {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 24px;
      padding-top: 48px;
      padding-bottom: calc(64px + env(safe-area-inset-bottom));
    }

    &--batch {
      display: flex;
      flex-direction: column;
      height: calc(80vh - 100rpx);
      padding: 16rpx 40rpx;
      padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
      overflow: visible;
    }
  }

  &__title {
    font-size: 36px;
    font-weight: 600;
    color: #1C1917;
    margin-bottom: 32px;
    display: block;
  }

  // AI 输入区
  &__ai-input {
    display: flex;
    flex-direction: column;
    border: none;
    border-radius: 36rpx;
    overflow: hidden;
    background: #FFFFFF;
    box-shadow:
      0 0 0 2px rgba(0, 0, 0, 0.04),
      0 4rpx 16rpx rgba(0, 0, 0, 0.05),
      0 8rpx 32rpx rgba(0, 0, 0, 0.03);
  }

  &__textarea {
    width: 100%;
    min-height: 120px;
    padding: 24px;
    font-size: 32px;
    color: #1C1917;
    background: transparent;
    box-sizing: border-box;
  }

  &__transcript {
    display: flex;
    align-items: center;
    gap: 16px;
    min-height: 120px;
    padding: 24px;
  }

  &__transcript-text {
    font-size: 32px;
    color: #1C1917;
    flex: 1;
  }

  &__transcript-placeholder {
    font-size: 32px;
    color: #A8A29E;
    flex: 1;
  }

  &__recording-dot {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background-color: #EF4444;
    animation: recDotBlink 1s ease-in-out infinite;
    flex-shrink: 0;
  }

  // 工具栏：外容器 36rpx，padding 12rpx，子圆角 = 36 - 12 = 24rpx
  &__ai-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 12rpx 12rpx;
  }

  &__toolbar-left {
    display: flex;
    align-items: center;
    gap: 12rpx;
  }

  &__ai-img-btn {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14rpx 28rpx;
    border-radius: 24rpx;
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(6, 182, 212, 0.08) 100%);
    border: none;
  }

  &__ai-icon {
    width: 36px;
    height: 36px;
  }

  &__ai-img-text {
    font-size: 28px;
    font-weight: 600;
    color: #2563EB;
  }

  // 话筒按钮
  &__ai-mic {
    width: 72px;
    height: 72px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 24rpx;
    background-color: #F5F5F4;
    transition: all 0.2s ease;

    &:active {
      transform: scale(0.92);
    }

    &--active {
      background-color: rgba(139, 92, 246, 0.12);
      animation: voicePulse 1s ease-in-out infinite;
    }
  }

  // 发送按钮
  &__ai-send {
    width: 72px;
    height: 72px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 24rpx;
    background-color: #D6D3D1;
    transition: all 0.2s ease;

    &:active {
      transform: scale(0.92);
    }

    &--active {
      background-color: #1C1917;
    }
  }

  // 快捷记录
  &__quick-entries {
    margin-top: 32px;
  }

  &__quick-label {
    font-size: 28px;
    color: #78716C;
    display: block;
    margin-bottom: 16px;
  }

  &__quick-list {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
  }

  &__quick-item {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px 32px;
    border: none;
    border-radius: 28rpx;
    background: #FAFAF9;
    box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.04);
    transition: all 0.2s ease;

    &:active {
      transform: scale(0.96);
      background: #F5F5F4;
    }
  }

  &__quick-icon {
    width: 32px;
    height: 32px;
  }

  &__quick-item-text {
    font-size: 28px;
    font-weight: 500;
    color: #1C1917;
  }

  // 体重表单
  &__calc-section {
    margin-bottom: 32px;
  }

  &__calc-label {
    font-size: 28px;
    color: #78716C;
    display: block;
    margin-bottom: 16px;
  }

  &__calc-row {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  &__calc-input-wrap {
    flex: 1;
    position: relative;
  }

  &__calc-input {
    width: 100%;
    height: 88px;
    padding: 0 72px 0 24px;
    border: 2px solid #E7E5E4;
    border-radius: 28rpx;
    font-size: 32px;
    background: transparent;
    color: #1C1917;
    box-sizing: border-box;
  }

  &__calc-unit {
    position: absolute;
    right: 24px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 28px;
    color: #78716C;
  }

  &__calc-minus {
    font-size: 40px;
    font-weight: 700;
    color: #78716C;
    flex-shrink: 0;
  }

  &__weight-field {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 24px;
  }

  &__weight-label {
    font-size: 28px;
    font-weight: 500;
    color: #78716C;
  }

  &__weight-input {
    height: 88px;
    padding: 0 32px;
    border: 2px solid #E7E5E4;
    border-radius: 28rpx;
    font-size: 32px;
    background: transparent;
    color: #1C1917;
    display: flex;
    align-items: center;
    box-sizing: border-box;

    &--main {
      height: 104px;
      font-size: 36px;
      font-weight: 500;
    }
  }

  &__weight-save {
    width: 100%;
    height: 88px;
    margin-top: 24px;
    border: none;
    border-radius: 28rpx;
    background-color: #1C1917;
    color: #FFFFFF;
    font-size: 32px;
    font-weight: 500;

    &:disabled {
      opacity: 0.5;
    }
  }

  // 通用表单样式
  &__form-field {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 24px;
  }

  &__form-label {
    font-size: 28px;
    font-weight: 500;
    color: #78716C;
  }

  &__form-input {
    height: 88px;
    padding: 0 32px;
    border: 2px solid #E7E5E4;
    border-radius: 28rpx;
    font-size: 32px;
    background: transparent;
    color: #1C1917;
    display: flex;
    align-items: center;
    box-sizing: border-box;
  }

  &__inline-input {
    position: relative;
    display: flex;
    align-items: center;

    .sheet__form-input {
      padding-right: 80px;
    }
  }

  &__inline-unit {
    position: absolute;
    right: 32px;
    font-size: 28px;
    color: #78716C;
    pointer-events: none;
  }

  &__chip-group {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
  }

  &__chip {
    padding: 16px 24px;
    border: 2px solid #E7E5E4;
    border-radius: 28rpx;
    font-size: 28px;
    color: #1C1917;

    &--active {
      background-color: #1C1917;
      color: #FFFFFF;
      border-color: #1C1917;
    }
  }

  &__form-save {
    width: 100%;
    height: 88px;
    margin-top: 24px;
    border: none;
    border-radius: 28rpx;
    background-color: #1C1917;
    color: #FFFFFF;
    font-size: 32px;
    font-weight: 500;

    &:disabled {
      opacity: 0.5;
    }
  }

  // Loading
  &__spinner {
    width: 64px;
    height: 64px;
    border: 6px solid #E7E5E4;
    border-top-color: #1C1917;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  &__loading-text {
    font-size: 36px;
    font-weight: 500;
    color: #1C1917;
  }

  &__loading-hint {
    font-size: 28px;
    color: #78716C;
  }

  &__voice-transcript {
    font-size: 28px;
    color: #1C1917;
    text-align: center;
    max-width: 560px;
    padding: 16px 24px;
    background-color: #F5F5F4;
    border-radius: 28rpx;
  }

  &__batch-progress {
    width: 300px;
    height: 8px;
    background-color: #E7E5E4;
    border-radius: 9999px;
    overflow: hidden;
  }

  &__batch-progress-bar {
    height: 100%;
    background-color: #1C1917;
    border-radius: 9999px;
    transition: width 0.3s ease;
  }

  &__error-icon {
    width: 64px;
    height: 64px;
  }

  &__error-text {
    font-size: 32px;
    color: #1C1917;
    text-align: center;
    max-width: 560px;
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes recDotBlink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

@keyframes voicePulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

// BatchConfirmCard 样式（确保打包）
.batch-confirm {
  display: flex;
  flex-direction: column;
  height: 100%;

  &__header {
    display: flex;
    align-items: baseline;
    gap: 16rpx;
    margin-bottom: 24rpx;
    flex-shrink: 0;
  }

  &__title {
    font-size: 36rpx;
    font-weight: 600;
    color: #1C1917;
  }

  &__subtitle {
    font-size: 28rpx;
    color: #78716C;
  }

  &__list {
    flex: 1;
    height: 0;
    box-sizing: border-box;
  }

  &__list-inner {
    padding: 4rpx;
  }

  .swipe-cell {
    margin-bottom: 16rpx;
    border-radius: 28rpx;

    .swipe-cell__delete {
      border-radius: 0 28rpx 28rpx 0;
    }
  }

  &__item {
    display: flex;
    align-items: flex-start;
    gap: 20rpx;
    padding: 20rpx;
    background-color: #FAFAF9;
    border-radius: 28rpx;

    &--error {
      background-color: #FEF2F2;
    }
  }

  &__thumb {
    width: 100rpx;
    height: 100rpx;
    border-radius: 20rpx;
    flex-shrink: 0;
  }

  &__content {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 12rpx;
  }

  &__info {
    display: flex;
    flex-direction: column;
    gap: 12rpx;
  }

  &__input {
    height: 64rpx;
    padding: 0 20rpx;
    font-size: 28rpx;
    color: #1C1917;
    background-color: #FFFFFF;
    border: 2rpx solid #E7E5E4;
    border-radius: 20rpx;
    box-sizing: border-box;
  }

  &__date {
    display: flex;
    align-items: center;
    gap: 8rpx;
  }

  &__date-icon {
    width: 28rpx;
    height: 28rpx;
    opacity: 0.6;
  }

  &__date-text {
    font-size: 26rpx;
    color: #78716C;
  }

  &__error {
    display: flex;
    align-items: center;
    gap: 12rpx;
    padding: 16rpx 0;
  }

  &__error-icon {
    width: 32rpx;
    height: 32rpx;
  }

  &__error-text {
    font-size: 26rpx;
    color: #DC2626;
  }

  &__loading {
    display: flex;
    align-items: center;
    gap: 12rpx;
    padding: 16rpx 0;
  }

  &__spinner {
    width: 32rpx;
    height: 32rpx;
    border: 4rpx solid #E7E5E4;
    border-top-color: #1C1917;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  &__loading-text {
    font-size: 26rpx;
    color: #78716C;
  }

  &__actions {
    display: flex;
    gap: 24rpx;
    padding-top: 24rpx;
    border-top: 2rpx solid #F5F5F4;
    flex-shrink: 0;
  }
}
</style>
