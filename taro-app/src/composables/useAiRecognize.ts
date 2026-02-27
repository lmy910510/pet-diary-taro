import { ref } from 'vue'
import Taro from '@tarojs/taro'
import type { RecognizeResult, RecognizeStatus, AiProvider } from '@/types/index'
import { AI_PROVIDER_MAP } from '@/types/index'
import { extractExifDate } from '@/utils/exifParser'

const SYSTEM_PROMPT = `你是宠物记录助手。分析图片，提取宠物相关信息，返回 JSON 数组。

返回格式（严格 JSON，无其他内容）：
[{"type":"medical|diet|growth|grooming","title":"标题含具体数值/名称","content":"详细描述","eventDate":"YYYY-MM-DD或空字符串","confidence":0.0-1.0}]

type: medical=疫苗/驱虫/就医, diet=饮食, growth=体重/成长, grooming=美容护理

title 要求：禁止写"体重记录"这样笼统的标题。体重写"体重 8.2kg"，疫苗写"接种卫佳捌疫苗"。

日期规则：
- eventDate 只填图中的事件发生日期（如手写的就诊日期、接种日期）
- 疫苗贴纸/标签上印刷的生产日期和有效期不是 eventDate
- 无法确定日期时填空字符串""，不要猜测

表格处理：
1. 先确定每行左侧的手写日期
2. 逐行提取，每行可拆为多条记录（疫苗+体重各一条）
3. 同一行拆出的所有记录必须用相同的 eventDate

示例输入：表格某行，左侧手写"2021/10.31"，体重8.2kg，贴了卫佳捌疫苗标签（标签印刷日期2020/05-14）
示例输出：
[{"type":"medical","title":"接种卫佳捌疫苗","content":"接种卫佳捌 Vanguard Plus 5/CV-L","eventDate":"2021-10-31","confidence":0.9},{"type":"growth","title":"体重 8.2kg","content":"体重 8.2kg","eventDate":"2021-10-31","confidence":0.9}]
注意：eventDate 是手写的2021-10-31，不是标签上的2020-05-14。`

function validateResult(data: any): data is RecognizeResult {
  const validTypes = ['medical', 'diet', 'growth', 'grooming', 'expense']
  if (!data || typeof data !== 'object') return false
  if (!validTypes.includes(data.type)) return false
  // 允许 title 为空，后续会填充默认值
  if (typeof data.title !== 'string') return false
  if (typeof data.content !== 'string') return false
  // 允许 eventDate 为空字符串（AI 无法识别日期时），后续会填充今天日期
  if (typeof data.eventDate !== 'string') return false
  if (data.eventDate !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(data.eventDate)) return false
  if (typeof data.confidence !== 'number' || data.confidence < 0 || data.confidence > 1) return false
  return true
}

/** 为空字段填充默认值 */
function fillDefaults(data: RecognizeResult): RecognizeResult {
  const typeLabels: Record<string, string> = {
    medical: '医疗记录',
    diet: '饮食记录',
    growth: '成长记录',
    grooming: '美容记录',
    expense: '消费记录'
  }
  
  return {
    ...data,
    title: data.title?.trim() || typeLabels[data.type] || '毛坨日记',
    content: data.content?.trim() || '（图片识别内容）'
  }
}

function filePathToBase64(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const fs = Taro.getFileSystemManager()
    fs.readFile({
      filePath,
      encoding: 'base64',
      success: (res) => {
        // 获取文件扩展名来判断 MIME 类型
        const ext = filePath.split('.').pop()?.toLowerCase() || 'png'
        const mimeMap: Record<string, string> = {
          jpg: 'image/jpeg',
          jpeg: 'image/jpeg',
          png: 'image/png',
          gif: 'image/gif',
          webp: 'image/webp'
        }
        const mime = mimeMap[ext] || 'image/png'
        resolve(`data:${mime};base64,${res.data}`)
      },
      fail: reject
    })
  })
}

/**
 * 从图片文件中提取 EXIF 拍摄日期
 * @param filePath 图片文件路径
 * @returns 拍摄日期（YYYY-MM-DD），如果无法提取则返回 null
 */
function getExifDateFromFile(filePath: string): Promise<string | null> {
  return new Promise((resolve) => {
    console.log('[EXIF] 开始读取文件:', filePath)
    
    const fs = Taro.getFileSystemManager()
    
    // 先尝试获取文件信息
    fs.getFileInfo({
      filePath,
      success: (fileInfo) => {
        console.log('[EXIF] 文件信息:', JSON.stringify(fileInfo))
      },
      fail: () => {}
    })
    
    fs.readFile({
      filePath,
      success: (res) => {
        try {
          // res.data 是 ArrayBuffer
          const buffer = res.data as ArrayBuffer
          console.log('[EXIF] 文件读取成功，大小:', buffer.byteLength, 'bytes')
          
          // 检测文件类型
          const view = new DataView(buffer)
          const firstByte = view.getUint8(0)
          const secondByte = view.getUint8(1)
          console.log('[EXIF] 文件头:', firstByte.toString(16), secondByte.toString(16))
          
          // 检查是否是 JPEG (FFD8)
          if (firstByte !== 0xFF || secondByte !== 0xD8) {
            console.log('[EXIF] 不是 JPEG 文件，可能是 PNG/HEIC 等格式')
            // 尝试查看前 20 个字节，帮助诊断
            const headerBytes: string[] = []
            for (let i = 0; i < Math.min(20, buffer.byteLength); i++) {
              headerBytes.push(view.getUint8(i).toString(16).padStart(2, '0'))
            }
            console.log('[EXIF] 文件头 20 字节:', headerBytes.join(' '))
            resolve(null)
            return
          }
          
          const exifDate = extractExifDate(buffer)
          console.log('[EXIF] 提取到的拍摄日期:', exifDate)
          resolve(exifDate)
        } catch (err) {
          console.warn('[EXIF] 解析失败:', err)
          resolve(null)
        }
      },
      fail: (err) => {
        console.warn('[EXIF] 读取文件失败:', err)
        resolve(null)
      }
    })
  })
}

/** 内置的 API Key（方便朋友试用） */
const BUILTIN_API_KEY = 'sk-26f0c8b61fb64a8881054b358dd2aeac'

/** 获取当前选择的 AI 提供商 */
export function getAiProvider(): AiProvider {
  return 'qwen'
}

/** 获取当前提供商的 API Key（优先使用用户设置的，否则使用内置的） */
export function getAiApiKey(provider?: AiProvider): string {
  const p = provider || getAiProvider()
  const userKey = Taro.getStorageSync(`${p}-api-key`) || ''
  // 优先返回用户设置的 Key，否则返回内置 Key
  return userKey || BUILTIN_API_KEY
}

/** 设置 API Key */
export function setAiApiKey(key: string, provider?: AiProvider) {
  const p = provider || getAiProvider()
  Taro.setStorageSync(`${p}-api-key`, key)
}

/** 检查是否使用内置 Key */
export function isUsingBuiltinKey(): boolean {
  const userKey = Taro.getStorageSync(`${getAiProvider()}-api-key`) || ''
  return !userKey
}


/** 单张图片识别的核心逻辑 — 返回一条或多条记录 */
async function recognizeImage(filePath: string): Promise<RecognizeResult[]> {
  const providerConfig = AI_PROVIDER_MAP.qwen
  const apiKey = getAiApiKey()

  if (!apiKey) {
    throw new Error('AI 服务暂时不可用，请稍后再试')
  }

  // 同时获取 Base64 和本地 EXIF（云端 EXIF 已禁用，避免拖慢识别速度）
  const [dataUrl, localExifDate] = await Promise.all([
    filePathToBase64(filePath),
    getExifDateFromFile(filePath)
  ])
  
  const exifDate = localExifDate
  console.log('[AI识别] 本地 EXIF:', localExifDate)
  console.log('[AI识别] 最终使用的 EXIF 日期:', exifDate)

  const userContent = [
    {
      type: 'image_url',
      image_url: { url: dataUrl }
    },
    {
      type: 'text',
      text: '请仔细分析这张图片中所有与宠物相关的信息，逐条提取每一条记录，不要遗漏。如果是表格请逐行提取。'
    }
  ]

  const response = await Taro.request({
    url: providerConfig.apiUrl,
    method: 'POST',
    header: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    data: {
      model: providerConfig.models.vision,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent }
      ],
      max_tokens: 4000,
      temperature: 0
    },
    timeout: 60000 // 60 秒超时
  })

  if (response.statusCode !== 200) {
    const errData = response.data as any
    const msg = errData?.error?.message || ''
    const code = errData?.error?.code || ''
    if (response.statusCode === 401) {
      throw new Error('API Key 无效或已过期，请在「我的」页面重新设置')
    } else if (response.statusCode === 429) {
      throw new Error('请求太频繁，请稍后再试')
    } else if (response.statusCode === 400) {
      throw new Error('图片格式不支持或文件过大，请换一张图片试试')
    } else if (response.statusCode >= 500) {
      throw new Error('通义千问服务暂时不可用，请稍后再试')
    } else if (response.statusCode === 403 || code === 'AccessDenied') {
      throw new Error('当前模型无访问权限，请前往阿里云 DashScope 控制台开通模型权限后重试')
    }
    throw new Error(msg || `请求失败（错误码 ${response.statusCode}），请稍后重试`)
  }

  const data = response.data as any
  const content = data.choices?.[0]?.message?.content

  // 调试日志
  console.log('[AI识别] 原始响应:', JSON.stringify(data, null, 2))
  console.log('[AI识别] AI返回内容:', content)

  if (!content) {
    throw new Error('AI 未返回有效内容，请换一张更清晰的图片试试')
  }

  // 尝试提取 JSON 数组或对象
  const jsonArrayMatch = content.match(/\[[\s\S]*\]/)
  const jsonObjMatch = content.match(/\{[\s\S]*\}/)
  const jsonStr = jsonArrayMatch?.[0] || jsonObjMatch?.[0]
  
  if (!jsonStr) {
    console.log('[AI识别] 无法提取JSON，原始内容:', content)
    throw new Error('无法从图片中提取有效信息，请确认图片包含宠物相关内容')
  }

  console.log('[AI识别] 提取的JSON:', jsonStr)
  const parsed = JSON.parse(jsonStr)
  
  // 统一转为数组
  const items: any[] = Array.isArray(parsed) ? parsed : [parsed]
  console.log('[AI识别] 解析到', items.length, '条记录')
  
  const results: RecognizeResult[] = []
  for (const item of items) {
    if (!validateResult(item)) {
      console.warn('[AI识别] 跳过无效记录:', item)
      continue
    }
    
    // 日期优先级：EXIF 拍摄日期 > AI 识别日期（仅单条时用 EXIF）
    if (items.length === 1 && exifDate) {
      console.log('[AI识别] 使用 EXIF 拍摄日期:', exifDate)
      item.eventDate = exifDate
    } else if (!item.eventDate) {
      console.log('[AI识别] 该条无日期，将由用户选择或默认今天')
    }
    
    results.push(fillDefaults(item))
  }
  
  if (results.length === 0) {
    throw new Error('识别结果格式异常，请换一张图片重试')
  }

  return results
}

/** 批量识别结果项 */
export interface BatchRecognizeItem {
  filePath: string
  result: RecognizeResult | null
  error: string
  status: 'pending' | 'processing' | 'done' | 'error'
}

export function useAiRecognize() {
  const status = ref<RecognizeStatus>('idle')
  const result = ref<RecognizeResult | null>(null)
  const multiResults = ref<RecognizeResult[]>([])
  const error = ref<string>('')
  
  // 批量识别相关
  const batchItems = ref<BatchRecognizeItem[]>([])
  const batchProgress = ref({ current: 0, total: 0 })

  async function recognize(filePath: string) {
    status.value = 'uploading'
    result.value = null
    multiResults.value = []
    error.value = ''

    try {
      status.value = 'recognizing'
      const results = await recognizeImage(filePath)
      
      if (results.length === 1) {
        // 单条结果走原有流程
        result.value = results[0]
        multiResults.value = []
      } else {
        // 多条结果走批量确认流程
        result.value = null
        multiResults.value = results
      }
      
      console.log('[AI识别] 最终结果:', results.length, '条')
      status.value = 'done'
    } catch (err: any) {
      console.error('[AI识别] 错误:', err)
      if (err instanceof SyntaxError) {
        error.value = '解析识别结果时出错，请重试'
      } else if (err.errMsg && err.errMsg.includes('request:fail')) {
        // Taro.request 网络错误
        if (err.errMsg.includes('timeout')) {
          error.value = '请求超时，请检查网络后重试'
        } else {
          error.value = `网络请求失败：${err.errMsg}`
        }
      } else {
        error.value = err.message || '识别失败，请稍后重试'
      }
      status.value = 'error'
    }
  }
  
  /** 批量识别多张图片 */
  async function recognizeBatch(filePaths: string[]) {
    if (filePaths.length === 0) return
    
    // 初始化批量识别状态
    batchItems.value = filePaths.map(filePath => ({
      filePath,
      result: null,
      error: '',
      status: 'pending' as const
    }))
    batchProgress.value = { current: 0, total: filePaths.length }
    status.value = 'recognizing'
    
    // 依次识别每张图片
    for (let i = 0; i < batchItems.value.length; i++) {
      const item = batchItems.value[i]
      item.status = 'processing'
      batchProgress.value.current = i + 1
      
      try {
        const results = await recognizeImage(item.filePath)
        // 批量模式下每张图取第一条结果
        item.result = results[0]
        item.status = 'done'
      } catch (err: any) {
        console.error(`[批量识别] 第 ${i + 1} 张图片识别失败:`, err)
        item.error = err.message || '识别失败'
        item.status = 'error'
      }
    }
    
    // 检查是否全部失败
    const successCount = batchItems.value.filter(item => item.status === 'done').length
    if (successCount === 0) {
      error.value = '所有图片识别失败，请重试'
      status.value = 'error'
    } else {
      status.value = 'done'
    }
  }
  
  /** 移除批量列表中的某一项 */
  function removeBatchItem(index: number) {
    batchItems.value.splice(index, 1)
  }
  
  /** 更新批量列表中某一项的结果 */
  function updateBatchItem(index: number, data: Partial<RecognizeResult>) {
    const item = batchItems.value[index]
    if (item && item.result) {
      item.result = { ...item.result, ...data }
    }
  }

  function reset() {
    status.value = 'idle'
    result.value = null
    multiResults.value = []
    error.value = ''
    batchItems.value = []
    batchProgress.value = { current: 0, total: 0 }
  }

  return {
    status,
    result,
    multiResults,
    error,
    recognize,
    reset,
    // 批量识别相关
    batchItems,
    batchProgress,
    recognizeBatch,
    removeBatchItem,
    updateBatchItem
  }
}
