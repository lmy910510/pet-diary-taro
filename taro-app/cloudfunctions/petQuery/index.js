const tcb = require('@cloudbase/node-sdk')

const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
const db = app.database()

// CORS 响应头
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

/**
 * 宠物数据查询云函数 - 管理员权限，不受 _openid 限制
 * 
 * action:
 *   - getPet: 按 petBookId 查询宠物信息
 *   - getRecords: 按 petBookId 查询所有记录
 *   - savePet: 保存/更新宠物信息
 *   - addRecord: 添加记录
 *   - updateRecord: 更新记录
 *   - deleteRecord: 删除记录
 */
exports.main = async (event) => {
  // 处理 OPTIONS 请求（CORS 预检）
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: '',
    }
  }

  // 解析请求体（HTTP API 调用时 body 是字符串）
  let requestData = event
  if (event.body) {
    try {
      requestData = typeof event.body === 'string' ? JSON.parse(event.body) : event.body
    } catch (e) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ success: false, error: '请求体解析失败' }),
      }
    }
  }

  const { action, data } = requestData
  let result

  try {
    switch (action) {
      case 'getPet': {
        const { petBookId } = data
        if (!petBookId) {
          result = { success: false, error: '缺少 petBookId' }
          break
        }
        const res = await db.collection('ps_pets')
          .where({ petBookId })
          .limit(1)
          .get()
        result = { success: true, data: res.data || [] }
        break
      }

      case 'getRecords': {
        const { petBookId } = data
        if (!petBookId) {
          result = { success: false, error: '缺少 petBookId' }
          break
        }
        const res = await db.collection('ps_records')
          .where({ petBookId })
          .orderBy('createdAt', 'desc')
          .limit(1000)
          .get()
        result = { success: true, data: res.data || [] }
        break
      }

      case 'savePet': {
        const { petBookId, petId, saveData } = data
        if (!petBookId) {
          result = { success: false, error: '缺少 petBookId' }
          break
        }

        if (petId) {
          // 更新
          await db.collection('ps_pets')
            .where({ petBookId, _id: petId })
            .update(saveData)
          result = { success: true, id: petId }
        } else {
          // 新增
          const res = await db.collection('ps_pets').add(saveData)
          result = { success: true, id: res.id }
        }
        break
      }

      case 'addRecord': {
        const { record } = data
        if (!record) {
          result = { success: false, error: '缺少 record' }
          break
        }
        const res = await db.collection('ps_records').add(record)
        result = { success: true, id: res.id }
        break
      }

      case 'updateRecord': {
        const { petBookId, recordId, updateData } = data
        if (!petBookId || !recordId) {
          result = { success: false, error: '缺少参数' }
          break
        }
        await db.collection('ps_records')
          .where({ petBookId, _id: recordId })
          .update(updateData)
        result = { success: true }
        break
      }

      case 'deleteRecord': {
        const { petBookId, recordId } = data
        if (!petBookId || !recordId) {
          result = { success: false, error: '缺少参数' }
          break
        }
        await db.collection('ps_records')
          .where({ petBookId, _id: recordId })
          .remove()
        result = { success: true }
        break
      }

      default:
        result = { success: false, error: `未知 action: ${action}` }
    }
  } catch (err) {
    result = { success: false, error: err.message || '操作失败' }
  }

  // HTTP API 返回格式
  if (event.httpMethod) {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(result),
    }
  }

  // SDK 调用直接返回结果
  return result
}
