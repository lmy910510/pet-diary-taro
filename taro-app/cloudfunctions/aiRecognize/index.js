const cloud = require('wx-server-sdk')
const https = require('https')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY || ''

const SYSTEM_PROMPT = `你是一个宠物生活记录助手。请分析用户上传的图片（可能是聊天截图、病历照片、手写日历等），
提取出与宠物相关的结构化信息。

请严格按照以下 JSON 格式返回，不要包含其他内容：
{
  "type": "medical" | "diet" | "expense" | "growth",
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
- expense: 购物、消费金额、账单等开销相关
- growth: 体重、身高、行为变化等成长相关

如果无法识别，confidence 设为 0，其他字段尽量填写合理默认值。`

/**
 * 校验 AI 返回的 JSON 结构
 */
function validateResult(data) {
  const validTypes = ['medical', 'diet', 'expense', 'growth']

  if (!data || typeof data !== 'object') return false
  if (!validTypes.includes(data.type)) return false
  if (typeof data.title !== 'string' || data.title.length === 0) return false
  if (typeof data.content !== 'string') return false
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.eventDate)) return false
  if (typeof data.confidence !== 'number' || data.confidence < 0 || data.confidence > 1) return false

  if (data.schedules && !Array.isArray(data.schedules)) return false

  return true
}

/**
 * 通过原生 HTTPS 调用 DashScope OpenAI 兼容接口
 */
function callDashScope(body, path = '/compatible-mode/v1/chat/completions') {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body)

    const options = {
      hostname: 'dashscope.aliyuncs.com',
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'Authorization': `Bearer ${DASHSCOPE_API_KEY}`
      }
    }

    const req = https.request(options, (res) => {
      let data = ''

      res.on('data', (chunk) => {
        data += chunk.toString()
      })

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data)
          if (parsed.error) {
            reject(new Error(parsed.error.message || JSON.stringify(parsed.error)))
            return
          }
          resolve(parsed)
        } catch (e) {
          reject(new Error('API 响应解析失败'))
        }
      })
    })

    req.on('error', reject)
    req.setTimeout(45000, () => {
      req.destroy()
      reject(new Error('API 请求超时'))
    })
    req.write(payload)
    req.end()
  })
}

/**
 * 图片识别
 */
async function recognizeImage(fileID) {
  if (!fileID) {
    return { success: false, error: '缺少 fileID 参数' }
  }

  if (!DASHSCOPE_API_KEY) {
    return { success: false, error: '未配置 DASHSCOPE_API_KEY 环境变量' }
  }

  const downloadRes = await cloud.downloadFile({ fileID })
  const buffer = downloadRes.fileContent
  const base64 = buffer.toString('base64')

  // 判断图片类型
  let mimeType = 'image/jpeg'
  if (fileID.endsWith('.png')) mimeType = 'image/png'
  else if (fileID.endsWith('.webp')) mimeType = 'image/webp'

  let retries = 0
  const maxRetries = 1
  let lastError = null

  while (retries <= maxRetries) {
    try {
      const response = await callDashScope({
        model: 'qwen-vl-plus',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64}`
                }
              },
              {
                type: 'text',
                text: '请分析这张图片中与宠物相关的信息。'
              }
            ]
          }
        ],
        max_tokens: 500,
        temperature: 0.3
      })

      const content = response.choices?.[0]?.message?.content
      if (!content) {
        retries++
        continue
      }

      // 提取 JSON
      let parsed = null
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0])
      }

      if (parsed && validateResult(parsed)) {
        return { success: true, data: parsed }
      }

      retries++
    } catch (err) {
      lastError = err
      retries++
    }
  }

  return {
    success: false,
    error: lastError ? lastError.message : 'AI 识别失败，请重试'
  }
}

/**
 * 语音识别 - 使用 DashScope qwen-audio-turbo（OpenAI 兼容格式，base64 音频）
 */
async function transcribeVoice(fileID) {
  if (!fileID) {
    return { success: false, error: '缺少 fileID 参数' }
  }

  if (!DASHSCOPE_API_KEY) {
    return { success: false, error: '未配置 DASHSCOPE_API_KEY 环境变量' }
  }

  try {
    console.log('[语音识别] 开始处理 fileID:', fileID)

    // 从云存储下载音频文件
    const downloadRes = await cloud.downloadFile({ fileID })
    const buffer = downloadRes.fileContent
    const base64 = buffer.toString('base64')

    console.log('[语音识别] 文件大小:', buffer.length, 'base64长度:', base64.length)

    // 调用 DashScope qwen-audio-turbo（OpenAI 兼容格式）
    // base64 前缀用 data:;base64, （官方文档格式）
    const response = await callDashScope({
      model: 'qwen-audio-turbo',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'audio_url',
              audio_url: {
                url: `data:;base64,${base64}`
              }
            },
            {
              type: 'text',
              text: '请将这段音频中的语音内容逐字转录为文字，只输出转录结果，不要添加任何额外解释。'
            }
          ]
        }
      ]
    })

    console.log('[语音识别] API 返回:', JSON.stringify(response).slice(0, 500))

    // 提取识别文本
    const content = response.choices?.[0]?.message?.content
    if (!content) {
      return { success: false, error: '语音识别返回为空' }
    }

    const text = (typeof content === 'string' ? content : '').trim()
    if (!text) {
      return { success: false, error: '未识别到语音内容' }
    }

    return { success: true, data: { text } }
  } catch (err) {
    console.error('[语音识别] 失败:', err.message || err)
    return { success: false, error: err.message || '语音识别失败' }
  }
}

exports.main = async (event) => {
  const { action = 'recognizeImage', fileID } = event

  if (action === 'transcribeVoice') {
    return transcribeVoice(fileID)
  }

  return recognizeImage(fileID)
}
