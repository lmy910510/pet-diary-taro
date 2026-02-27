import { ref } from 'vue'
import Taro from '@tarojs/taro'
import type { RecognizeResult } from '@/types/index'
import { AI_PROVIDER_MAP } from '@/types/index'
import { getAiApiKey } from '@/composables/useAiRecognize'

export type VoiceStatus = 'idle' | 'listening' | 'processing' | 'done' | 'error'

const VOICE_SYSTEM_PROMPT = `你是一个宠物生活记录助手。用户会通过语音告诉你宠物今天发生了什么事，请分析语音转写的文本，提取出结构化信息。

请严格按照以下 JSON 格式返回，不要包含其他内容：
{
  "type": "medical" | "diet" | "growth" | "grooming",
  "title": "简短标题，不超过20字",
  "content": "详细内容描述，不超过100字",
  "eventDate": "YYYY-MM-DD格式的日期",
  "confidence": 0.0-1.0之间的置信度,
  "schedules": []
}

type 分类规则：
- medical: 体检、疫苗、驱虫、就医、用药、看病、打针等医疗相关
- diet: 喂食、换粮、饮水、营养补充、吃了什么、零食等饮食相关
- growth: 体重、身高、行为变化、学会了什么等成长相关
- grooming: 剪毛、洗澡、美容、修指甲、梳毛、造型、spa等美容护理相关

日期推断规则：
- "今天" → 使用 TODAY_DATE
- "昨天" → TODAY_DATE 前一天
- "前天" → TODAY_DATE 前两天
- "上周X" → 计算对应日期
- 没有明确提到日期 → 默认使用 TODAY_DATE

请从语音文本中提取宠物名字和事件，生成合适的标题和详细内容。`

function validateResult(data: any): data is RecognizeResult {
  const validTypes = ['medical', 'diet', 'growth', 'grooming', 'expense']
  if (!data || typeof data !== 'object') return false
  if (!validTypes.includes(data.type)) return false
  if (typeof data.title !== 'string' || data.title.length === 0) return false
  if (typeof data.content !== 'string') return false
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.eventDate)) return false
  if (typeof data.confidence !== 'number' || data.confidence < 0 || data.confidence > 1) return false
  return true
}

function getTodayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function useVoiceRecognize() {
  const status = ref<VoiceStatus>('idle')
  const result = ref<RecognizeResult | null>(null)
  const error = ref('')
  const transcript = ref('')
  const isListening = ref(false)

  let recorderManager: Taro.RecorderManager | null = null

  /** 开始语音录入 */
  function startListening(): Promise<string> {
    return new Promise((resolve, reject) => {
      recorderManager = Taro.getRecorderManager()

      recorderManager.onStart(() => {
        isListening.value = true
        status.value = 'listening'
        transcript.value = ''
      })

      recorderManager.onError((res) => {
        isListening.value = false
        reject(new Error(res.errMsg || '录音失败'))
      })

      recorderManager.onStop((res) => {
        isListening.value = false
        // 语音识别已通过微信同声传译插件在 AiRecognizeSheet 中完成
        // 这里仅停止录音，不做识别
        resolve('')
      })

      recorderManager.start({
        duration: 60000,
        sampleRate: 16000,
        numberOfChannels: 1,
        encodeBitRate: 48000,
        format: 'mp3'
      })
    })
  }

  /** 停止语音录入 */
  function stopListening() {
    if (recorderManager) {
      recorderManager.stop()
    }
  }

  /** 用 AI 解析文本（文字输入模式） */
  async function parseWithAi(text: string): Promise<RecognizeResult> {
    const providerConfig = AI_PROVIDER_MAP.qwen
    const apiKey = getAiApiKey()

    if (!apiKey) {
      throw new Error('AI 服务暂时不可用，请稍后再试')
    }

    const todayStr = getTodayStr()
    const prompt = VOICE_SYSTEM_PROMPT.replace(/TODAY_DATE/g, todayStr)

    const response = await Taro.request({
      url: providerConfig.apiUrl,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      data: {
        model: 'qwen-turbo',
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: `今天是 ${todayStr}。内容：「${text}」` }
        ],
        max_tokens: 500,
        temperature: 0.3
      },
      timeout: 30000
    })

    if (response.statusCode !== 200) {
      const errData = response.data as any
      if (response.statusCode === 401) {
        throw new Error('API Key 无效或已过期')
      } else if (response.statusCode === 429) {
        throw new Error('请求太频繁，请稍后再试')
      }
      throw new Error(errData?.error?.message || `请求失败（错误码 ${response.statusCode}）`)
    }

    const data = response.data as any
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      throw new Error('AI 未返回有效内容')
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('无法解析内容，请尝试描述得更清楚')
    }

    const parsed = JSON.parse(jsonMatch[0])
    if (!validateResult(parsed)) {
      throw new Error('识别结果格式异常，请重试')
    }

    return parsed
  }

  function reset() {
    status.value = 'idle'
    result.value = null
    error.value = ''
    transcript.value = ''
    isListening.value = false
    if (recorderManager) {
      try { recorderManager.stop() } catch {}
      recorderManager = null
    }
  }

  return {
    status,
    result,
    error,
    transcript,
    isListening,
    stopListening,
    startListening,
    parseWithAi,
    reset
  }
}
