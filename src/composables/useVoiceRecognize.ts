import { ref } from 'vue'
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

/** 检测浏览器是否支持语音识别 */
export function isSpeechRecognitionSupported(): boolean {
  return !!(window.SpeechRecognition || (window as any).webkitSpeechRecognition)
}

export function useVoiceRecognize() {
  const status = ref<VoiceStatus>('idle')
  const result = ref<RecognizeResult | null>(null)
  const error = ref('')
  const transcript = ref('')
  const isListening = ref(false)

  let recognition: any = null

  /** 开始语音录入 */
  function startListening(): Promise<string> {
    return new Promise((resolve, reject) => {
      const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition

      if (!SpeechRecognition) {
        reject(new Error('当前浏览器不支持语音识别，请使用 Chrome 或 Safari'))
        return
      }

      recognition = new SpeechRecognition()
      recognition.lang = 'zh-CN'
      recognition.continuous = false
      recognition.interimResults = true
      recognition.maxAlternatives = 1

      let finalTranscript = ''

      recognition.onstart = () => {
        isListening.value = true
        status.value = 'listening'
        transcript.value = ''
      }

      recognition.onresult = (event: any) => {
        let interim = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += t
          } else {
            interim += t
          }
        }
        transcript.value = finalTranscript + interim
      }

      recognition.onerror = (event: any) => {
        isListening.value = false
        if (event.error === 'no-speech') {
          reject(new Error('未检测到语音，请重试'))
        } else if (event.error === 'not-allowed') {
          reject(new Error('麦克风权限被拒绝，请在浏览器设置中允许访问麦克风'))
        } else if (event.error === 'network') {
          reject(new Error('网络错误，语音识别服务不可用'))
        } else {
          reject(new Error(`语音识别失败: ${event.error}`))
        }
      }

      recognition.onend = () => {
        isListening.value = false
        if (finalTranscript) {
          transcript.value = finalTranscript
          resolve(finalTranscript)
        } else if (transcript.value) {
          resolve(transcript.value)
        } else {
          reject(new Error('未能识别到有效语音内容，请重试'))
        }
      }

      recognition.start()
    })
  }

  /** 停止语音录入 */
  function stopListening() {
    if (recognition) {
      recognition.stop()
    }
  }

  /** 用 AI 解析语音文本 */
  async function parseWithAi(text: string): Promise<RecognizeResult> {
    const providerConfig = AI_PROVIDER_MAP.qwen
    const apiKey = getAiApiKey()

    if (!apiKey) {
      throw new Error('请先在「我的」页面设置通义千问 API Key')
    }

    const todayStr = getTodayStr()
    const prompt = VOICE_SYSTEM_PROMPT.replace(/TODAY_DATE/g, todayStr)

    const response = await fetch(providerConfig.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'qwen-turbo',
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: `今天是 ${todayStr}。语音内容：「${text}」` }
        ],
        max_tokens: 500,
        temperature: 0.3
      })
    })

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}))
      if (response.status === 401) {
        throw new Error('API Key 无效或已过期')
      } else if (response.status === 429) {
        throw new Error('请求太频繁，请稍后再试')
      }
      throw new Error(errData.error?.message || `请求失败（错误码 ${response.status}）`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      throw new Error('AI 未返回有效内容')
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('无法解析语音内容，请尝试描述得更清楚')
    }

    const parsed = JSON.parse(jsonMatch[0])
    if (!validateResult(parsed)) {
      throw new Error('识别结果格式异常，请重试')
    }

    return parsed
  }

  /** 完整的语音识别流程：录音 → 转文字 → AI 解析 */
  async function recognize() {
    status.value = 'listening'
    result.value = null
    error.value = ''
    transcript.value = ''

    try {
      const text = await startListening()
      status.value = 'processing'
      const parsed = await parseWithAi(text)
      result.value = parsed
      status.value = 'done'
    } catch (err: any) {
      error.value = err.message || '语音识别失败'
      status.value = 'error'
    }
  }

  function reset() {
    status.value = 'idle'
    result.value = null
    error.value = ''
    transcript.value = ''
    isListening.value = false
    if (recognition) {
      try { recognition.abort() } catch {}
      recognition = null
    }
  }

  return {
    status,
    result,
    error,
    transcript,
    isListening,
    recognize,
    stopListening,
    startListening,
    parseWithAi,
    reset
  }
}
