const cloud = require('wx-server-sdk')
const { OpenAI } = require('openai')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
  timeout: 30000
})

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

exports.main = async (event) => {
  const { fileID } = event

  if (!fileID) {
    return { success: false, error: '缺少 fileID 参数' }
  }

  // 下载图片
  const downloadRes = await cloud.downloadFile({ fileID })
  const buffer = downloadRes.fileContent
  const base64 = buffer.toString('base64')

  // 判断图片类型
  let mimeType = 'image/jpeg'
  if (fileID.endsWith('.png')) mimeType = 'image/png'
  else if (fileID.endsWith('.webp')) mimeType = 'image/webp'

  // 调用 GPT-4o-mini Vision
  let retries = 0
  const maxRetries = 1
  let lastError = null

  while (retries <= maxRetries) {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64}`,
                detail: 'low'
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
    }).catch((err) => {
      lastError = err
      return null
    })

    if (!response) {
      retries++
      continue
    }

    const content = response.choices[0]?.message?.content
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
  }

  return {
    success: false,
    error: lastError ? lastError.message : 'AI 识别失败，请重试'
  }
}
