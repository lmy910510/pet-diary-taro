import { ref } from 'vue'
import type { RecognizeResult, RecognizeStatus, AiProvider } from '@/types/index'
import { AI_PROVIDER_MAP } from '@/types/index'

const SYSTEM_PROMPT = `你是一个宠物生活记录助手。请分析用户上传的图片（可能是聊天截图、病历照片、手写日历等），
提取出与宠物相关的结构化信息。

请严格按照以下 JSON 格式返回，不要包含其他内容：
{
  "type": "medical" | "diet" | "growth" | "grooming",
  "title": "简短标题，不超过20字",
  "content": "详细内容描述，不超过100字",
  "eventDate": "YYYY-MM-DD格式的日期",
  "confidence": 0.0-1.0之间的置信度,
  "schedules": [
    {
      "title": "日程标题",
      "date": "YYYY-MM-DD",
      "time": "HH:mm（可选）"
    }
  ]
}

type 分类规则：
- medical: 体检、疫苗、驱虫、就医、用药等医疗相关
- diet: 喂食、换粮、饮水、营养补充等饮食相关
- growth: 体重、身高、行为变化等成长相关
- grooming: 剪毛、洗澡、美容、修指甲、梳毛、造型、spa等美容护理相关

如果无法识别，confidence 设为 0，其他字段尽量填写合理默认值。`

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

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      resolve(dataUrl)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/** 获取当前选择的 AI 提供商 */
export function getAiProvider(): AiProvider {
  return 'qwen'
}

/** 获取当前提供商的 API Key */
export function getAiApiKey(provider?: AiProvider): string {
  const p = provider || getAiProvider()
  return localStorage.getItem(`${p}-api-key`) || ''
}

export function useAiRecognize() {
  const status = ref<RecognizeStatus>('idle')
  const result = ref<RecognizeResult | null>(null)
  const error = ref<string>('')

  async function recognize(file: File) {
    status.value = 'uploading'
    result.value = null
    error.value = ''

    try {
      const providerConfig = AI_PROVIDER_MAP.qwen
      const apiKey = getAiApiKey()

      if (!apiKey) {
        error.value = '请先在「我的」页面设置通义千问 API Key'
        status.value = 'error'
        return
      }

      const dataUrl = await fileToBase64(file)
      status.value = 'recognizing'

      const userContent = [
        {
          type: 'image_url',
          image_url: { url: dataUrl }
        },
        {
          type: 'text',
          text: '请分析这张图片中与宠物相关的信息。'
        }
      ]

      const response = await fetch(providerConfig.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: providerConfig.models.vision,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userContent }
          ],
          max_tokens: 500,
          temperature: 0.3
        })
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        const msg = errData.error?.message || ''
        const code = errData.error?.code || ''
        if (response.status === 401) {
          throw new Error('API Key 无效或已过期，请在「我的」页面重新设置')
        } else if (response.status === 429) {
          throw new Error('请求太频繁，请稍后再试')
        } else if (response.status === 400) {
          throw new Error('图片格式不支持或文件过大，请换一张图片试试')
        } else if (response.status >= 500) {
          throw new Error('通义千问服务暂时不可用，请稍后再试')
        } else if (response.status === 403 || code === 'AccessDenied' || msg.toLowerCase().includes('access') && msg.toLowerCase().includes('denied')) {
          throw new Error('当前模型无访问权限，请前往阿里云 DashScope 控制台开通模型权限后重试')
        }
        throw new Error(msg || `请求失败（错误码 ${response.status}），请稍后重试`)
      }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content

      if (!content) {
        throw new Error('AI 未返回有效内容，请换一张更清晰的图片试试')
      }

      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('无法从图片中提取有效信息，请确认图片包含宠物相关内容')
      }

      const parsed = JSON.parse(jsonMatch[0])
      if (!validateResult(parsed)) {
        throw new Error('识别结果格式异常，请换一张图片重试')
      }

      result.value = parsed
      status.value = 'done'
    } catch (err: any) {
      if (err instanceof SyntaxError) {
        error.value = '解析识别结果时出错，请重试'
      } else {
        error.value = err.message || '识别失败，请稍后重试'
      }
      status.value = 'error'
    }
  }

  function reset() {
    status.value = 'idle'
    result.value = null
    error.value = ''
  }

  return {
    status,
    result,
    error,
    recognize,
    reset
  }
}
