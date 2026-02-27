const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

/**
 * 用户认证云函数
 * 
 * action:
 *   - login: 微信登录，返回/创建用户
 *   - getUserInfo: 获取当前用户信息
 *   - updateProfile: 更新用户资料
 *   - shareBook: 生成档案分享码
 *   - joinBook: 通过分享码加入档案
 *   - getSharedBooks: 获取用户可访问的所有档案（自己的+被邀请的）
 */

/**
 * 为档案列表附加宠物头像
 * @param {Array} books - 档案列表
 * @returns {Promise<Array>} 带有宠物头像的档案列表
 */
async function attachPetAvatars(books) {
  if (!books || books.length === 0) return books
  
  const bookIds = books.map(b => b.bookId)
  
  try {
    // 批量查询这些档案对应的宠物信息
    const petsRes = await db.collection('ps_pets')
      .where({
        petBookId: _.in(bookIds)
      })
      .field({
        petBookId: true,
        avatar: true,
        name: true
      })
      .get()
    
    // 创建 bookId -> pet 的映射
    const petMap = {}
    for (const pet of petsRes.data) {
      petMap[pet.petBookId] = pet
    }
    
    // 附加头像到档案
    return books.map(book => ({
      ...book,
      petAvatar: petMap[book.bookId]?.avatar || '',
      petName: petMap[book.bookId]?.name || ''
    }))
  } catch (err) {
    console.warn('[attachPetAvatars] 查询宠物头像失败:', err)
    return books
  }
}
exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  if (!openid) {
    return { success: false, error: '未获取到用户身份' }
  }

  const { action, data = {} } = event
  let result

  try {
    switch (action) {
      case 'login': {
        // 查询用户是否存在
        const userRes = await db.collection('ps_users')
          .where({ _openid: openid })
          .limit(1)
          .get()

        if (userRes.data.length > 0) {
          // 已存在，更新最后登录时间
          const user = userRes.data[0]
          await db.collection('ps_users').doc(user._id).update({
            data: { lastLoginAt: db.serverDate() }
          })
          
          // 附加宠物头像
          const ownedBooksWithAvatar = await attachPetAvatars(user.ownedBooks || [])
          const sharedBooksWithAvatar = await attachPetAvatars(user.sharedBooks || [])
          
          result = { 
            success: true, 
            data: { 
              ...user,
              ownedBooks: ownedBooksWithAvatar,
              sharedBooks: sharedBooksWithAvatar,
              isNew: false,
              lastLoginAt: new Date().toISOString()
            } 
          }
        } else {
          // 新用户，创建记录
          const newUser = {
            _openid: openid,
            nickname: data.nickname || '宠物主人',
            avatarUrl: data.avatarUrl || '',
            // 自动创建一个默认档案
            ownedBooks: [{
              bookId: `book_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
              name: '我的宠物档案',
              createdAt: db.serverDate()
            }],
            sharedBooks: [], // 被邀请加入的档案
            createdAt: db.serverDate(),
            lastLoginAt: db.serverDate()
          }
          
          const addRes = await db.collection('ps_users').add({ data: newUser })
          
          result = { 
            success: true, 
            data: { 
              _id: addRes._id,
              ...newUser,
              isNew: true 
            } 
          }
        }
        break
      }

      case 'getUserInfo': {
        const userRes = await db.collection('ps_users')
          .where({ _openid: openid })
          .limit(1)
          .get()

        if (userRes.data.length > 0) {
          const user = userRes.data[0]
          
          // 附加宠物头像
          const ownedBooksWithAvatar = await attachPetAvatars(user.ownedBooks || [])
          const sharedBooksWithAvatar = await attachPetAvatars(user.sharedBooks || [])
          
          result = { 
            success: true, 
            data: {
              ...user,
              ownedBooks: ownedBooksWithAvatar,
              sharedBooks: sharedBooksWithAvatar
            }
          }
        } else {
          result = { success: false, error: '用户不存在' }
        }
        break
      }

      case 'updateProfile': {
        const { nickname, avatarUrl } = data
        const updateData = {}
        if (nickname !== undefined) updateData.nickname = nickname
        if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl

        if (Object.keys(updateData).length === 0) {
          result = { success: false, error: '没有需要更新的字段' }
          break
        }

        await db.collection('ps_users')
          .where({ _openid: openid })
          .update({ data: updateData })

        result = { success: true }
        break
      }

      case 'createBook': {
        // 创建新档案
        const { name } = data
        if (!name) {
          result = { success: false, error: '档案名称不能为空' }
          break
        }

        const newBook = {
          bookId: `book_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          name,
          createdAt: db.serverDate()
        }

        await db.collection('ps_users')
          .where({ _openid: openid })
          .update({
            data: {
              ownedBooks: _.push(newBook)
            }
          })

        result = { success: true, data: newBook }
        break
      }

      case 'shareBook': {
        // 生成档案分享码
        const { bookId } = data
        if (!bookId) {
          result = { success: false, error: '缺少档案ID' }
          break
        }

        // 验证用户拥有该档案
        const userRes = await db.collection('ps_users')
          .where({ _openid: openid })
          .limit(1)
          .get()

        if (userRes.data.length === 0) {
          result = { success: false, error: '用户不存在' }
          break
        }

        const user = userRes.data[0]
        const ownedBook = (user.ownedBooks || []).find(b => b.bookId === bookId)
        
        if (!ownedBook) {
          result = { success: false, error: '你不是该档案的拥有者' }
          break
        }

        // 生成6位分享码，有效期24小时
        const shareCode = Math.random().toString(36).substr(2, 6).toUpperCase()
        const expireAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

        // 存储分享码（使用单独的集合管理）
        await db.collection('ps_share_codes').add({
          data: {
            code: shareCode,
            bookId,
            bookName: ownedBook.name,
            ownerOpenid: openid,
            ownerNickname: user.nickname,
            expireAt,
            createdAt: db.serverDate()
          }
        })

        result = { 
          success: true, 
          data: { 
            shareCode, 
            expireAt: expireAt.toISOString(),
            bookName: ownedBook.name
          } 
        }
        break
      }

      case 'joinBook': {
        // 通过分享码加入档案
        const { shareCode } = data
        if (!shareCode) {
          result = { success: false, error: '缺少分享码' }
          break
        }

        // 查找分享码
        const codeRes = await db.collection('ps_share_codes')
          .where({ code: shareCode.toUpperCase() })
          .limit(1)
          .get()

        if (codeRes.data.length === 0) {
          result = { success: false, error: '分享码无效' }
          break
        }

        const shareInfo = codeRes.data[0]

        // 检查是否过期
        if (new Date(shareInfo.expireAt) < new Date()) {
          result = { success: false, error: '分享码已过期' }
          break
        }

        // 检查是否是自己的档案
        if (shareInfo.ownerOpenid === openid) {
          result = { success: false, error: '不能加入自己的档案' }
          break
        }

        // 检查是否已经加入
        const userRes = await db.collection('ps_users')
          .where({ _openid: openid })
          .limit(1)
          .get()

        if (userRes.data.length === 0) {
          result = { success: false, error: '用户不存在' }
          break
        }

        const user = userRes.data[0]
        const alreadyJoined = (user.sharedBooks || []).some(b => b.bookId === shareInfo.bookId)

        if (alreadyJoined) {
          result = { success: false, error: '你已经加入了该档案' }
          break
        }

        // 添加到共享档案列表
        await db.collection('ps_users')
          .where({ _openid: openid })
          .update({
            data: {
              sharedBooks: _.push({
                bookId: shareInfo.bookId,
                name: shareInfo.bookName,
                ownerOpenid: shareInfo.ownerOpenid,
                ownerNickname: shareInfo.ownerNickname,
                joinedAt: db.serverDate()
              })
            }
          })

        result = { 
          success: true, 
          data: { 
            bookId: shareInfo.bookId,
            bookName: shareInfo.bookName,
            ownerNickname: shareInfo.ownerNickname
          } 
        }
        break
      }

      case 'getSharedBooks': {
        // 获取用户可访问的所有档案
        const userRes = await db.collection('ps_users')
          .where({ _openid: openid })
          .limit(1)
          .get()

        if (userRes.data.length === 0) {
          result = { success: false, error: '用户不存在' }
          break
        }

        const user = userRes.data[0]
        const ownedBooks = (user.ownedBooks || []).map(b => ({ 
          ...b, 
          isOwner: true 
        }))
        const sharedBooks = (user.sharedBooks || []).map(b => ({ 
          ...b, 
          isOwner: false 
        }))

        result = { 
          success: true, 
          data: {
            ownedBooks,
            sharedBooks,
            allBooks: [...ownedBooks, ...sharedBooks]
          }
        }
        break
      }

      case 'leaveBook': {
        // 退出共享档案
        const { bookId } = data
        if (!bookId) {
          result = { success: false, error: '缺少档案ID' }
          break
        }

        await db.collection('ps_users')
          .where({ _openid: openid })
          .update({
            data: {
              sharedBooks: _.pull({
                bookId: _.eq(bookId)
              })
            }
          })

        result = { success: true }
        break
      }

      default:
        result = { success: false, error: `未知 action: ${action}` }
    }
  } catch (err) {
    console.error('[userAuth] Error:', err)
    result = { success: false, error: err.message || '操作失败' }
  }

  return result
}
