const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

/**
 * 检测文件格式
 * @param {Buffer} buffer 
 * @returns {'jpeg' | 'heif' | 'png' | 'unknown'}
 */
function detectFormat(buffer) {
  if (buffer.length < 12) return 'unknown'
  
  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'jpeg'
  }
  
  // HEIF/HEIC: 检查 ftyp box
  // 偏移 4-7 是 'ftyp'，偏移 8-11 是具体类型如 'heic', 'mif1', 'msf1', 'heix'
  const ftyp = buffer.slice(4, 8).toString('ascii')
  if (ftyp === 'ftyp') {
    const brand = buffer.slice(8, 12).toString('ascii')
    console.log('[Format] ftyp brand:', brand)
    if (['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1', 'avif'].includes(brand)) {
      return 'heif'
    }
  }
  
  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return 'png'
  }
  
  return 'unknown'
}

/**
 * 从 JPEG Buffer 中提取 EXIF 拍摄日期
 */
function extractExifDateFromJpeg(buffer) {
  try {
    let offset = 2
    const length = buffer.length
    let segmentCount = 0

    console.log('[EXIF-JPEG] 开始解析 JPEG，总长度:', length)

    while (offset < length - 4 && segmentCount < 20) {
      if (buffer[offset] !== 0xFF) {
        offset++
        continue
      }

      const marker = buffer[offset + 1]
      segmentCount++
      
      // 打印找到的所有段标记
      const markerName = {
        0xE0: 'APP0 (JFIF)',
        0xE1: 'APP1 (EXIF)',
        0xE2: 'APP2',
        0xDB: 'DQT',
        0xC0: 'SOF0',
        0xC4: 'DHT',
        0xDA: 'SOS',
        0xD9: 'EOI'
      }[marker] || `0x${marker.toString(16)}`
      
      console.log('[EXIF-JPEG] 段 #' + segmentCount + ':', markerName, '偏移:', offset)

      // APP1 标记 (0xE1) 包含 EXIF 数据
      if (marker === 0xE1) {
        const segmentLength = (buffer[offset + 2] << 8) | buffer[offset + 3]
        console.log('[EXIF-JPEG] APP1 段长度:', segmentLength)
        
        // 检查 "Exif\0\0" 标识
        const exifHeader = buffer.slice(offset + 4, offset + 10).toString('ascii')
        console.log('[EXIF-JPEG] APP1 头部内容:', JSON.stringify(exifHeader))
        
        if (exifHeader.startsWith('Exif')) {
          console.log('[EXIF-JPEG] 找到 EXIF 数据!')
          const tiffOffset = offset + 10
          return parseTiffHeader(buffer, tiffOffset)
        } else {
          console.log('[EXIF-JPEG] APP1 不是 EXIF，可能是 XMP')
        }
      }

      if (marker === 0xD8 || marker === 0xD9) {
        offset += 2
      } else if (marker === 0xDA) {
        console.log('[EXIF-JPEG] 到达图像数据段，停止搜索')
        break
      } else {
        if (offset + 3 < length) {
          const segmentLength = (buffer[offset + 2] << 8) | buffer[offset + 3]
          offset += 2 + segmentLength
        } else {
          break
        }
      }
    }

    console.log('[EXIF-JPEG] 未找到 EXIF APP1 段')
    return null
  } catch (err) {
    console.error('[EXIF-JPEG] 解析错误:', err)
    return null
  }
}

/**
 * 从 HEIF/HEIC Buffer 中提取 EXIF 拍摄日期
 * HEIF 使用 ISO Base Media File Format (ISOBMFF)
 */
function extractExifDateFromHeif(buffer) {
  try {
    console.log('[EXIF-HEIF] 开始解析 HEIF 格式')
    
    // HEIF 使用 box 结构，我们需要找到 meta -> iinf -> iloc -> Exif
    // 或者直接在文件中搜索 EXIF 数据
    
    // 方法1：搜索 "Exif" 标识（简单但有效）
    const exifMarker = Buffer.from('Exif\0\0')
    let exifOffset = buffer.indexOf(exifMarker)
    
    if (exifOffset !== -1) {
      console.log('[EXIF-HEIF] 找到 Exif 标识，偏移:', exifOffset)
      // TIFF header 在 "Exif\0\0" 之后
      const tiffOffset = exifOffset + 6
      return parseTiffHeader(buffer, tiffOffset)
    }
    
    // 方法2：解析 ISOBMFF box 结构
    let offset = 0
    while (offset < buffer.length - 8) {
      const boxSize = buffer.readUInt32BE(offset)
      const boxType = buffer.slice(offset + 4, offset + 8).toString('ascii')
      
      if (boxSize === 0) break
      if (boxSize === 1) {
        // 64-bit size，跳过
        offset += 16
        continue
      }
      
      console.log('[EXIF-HEIF] Box:', boxType, 'Size:', boxSize, 'Offset:', offset)
      
      // meta box 包含 EXIF
      if (boxType === 'meta') {
        // meta box 内部有嵌套的 box
        const metaResult = parseMetaBox(buffer, offset + 12, offset + boxSize)
        if (metaResult) return metaResult
      }
      
      offset += boxSize
    }
    
    console.log('[EXIF-HEIF] 未找到 EXIF 数据')
    return null
  } catch (err) {
    console.error('[EXIF-HEIF] 解析错误:', err)
    return null
  }
}

/**
 * 解析 meta box 内部，查找 EXIF
 */
function parseMetaBox(buffer, start, end) {
  try {
    let offset = start
    
    while (offset < end - 8) {
      const boxSize = buffer.readUInt32BE(offset)
      const boxType = buffer.slice(offset + 4, offset + 8).toString('ascii')
      
      if (boxSize === 0 || boxSize > end - offset) break
      
      console.log('[EXIF-HEIF] Meta 内部 Box:', boxType, 'Size:', boxSize)
      
      // iinf (item info box) 或直接的 Exif box
      if (boxType === 'Exif') {
        // Exif box 格式: size(4) + 'Exif'(4) + version/flags(4) + offset(4) + TIFF data
        const tiffOffset = offset + 12
        // 检查是否有 "Exif\0\0" 前缀
        const prefix = buffer.slice(tiffOffset, tiffOffset + 6).toString('ascii')
        if (prefix.startsWith('Exif')) {
          return parseTiffHeader(buffer, tiffOffset + 6)
        } else {
          // 直接是 TIFF 数据
          return parseTiffHeader(buffer, tiffOffset)
        }
      }
      
      offset += boxSize
    }
  } catch (err) {
    console.error('[EXIF-HEIF] Meta box 解析错误:', err)
  }
  return null
}

/**
 * 解析 TIFF 头部，查找日期标签
 */
function parseTiffHeader(buffer, tiffOffset) {
  try {
    if (tiffOffset + 8 > buffer.length) {
      console.log('[EXIF] TIFF offset 超出范围')
      return null
    }
    
    // 读取字节序
    const byteOrderMark = buffer.slice(tiffOffset, tiffOffset + 2).toString('ascii')
    const littleEndian = byteOrderMark === 'II'
    
    console.log('[EXIF] 字节序:', byteOrderMark, littleEndian ? 'Little Endian' : 'Big Endian')

    const readUint16 = (offset) => {
      if (offset + 2 > buffer.length) return 0
      if (littleEndian) {
        return buffer[offset] | (buffer[offset + 1] << 8)
      }
      return (buffer[offset] << 8) | buffer[offset + 1]
    }

    const readUint32 = (offset) => {
      if (offset + 4 > buffer.length) return 0
      if (littleEndian) {
        return buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16) | (buffer[offset + 3] << 24)
      }
      return (buffer[offset] << 24) | (buffer[offset + 1] << 16) | (buffer[offset + 2] << 8) | buffer[offset + 3]
    }

    // 检查 TIFF 标识 (0x002A)
    const tiffMagic = readUint16(tiffOffset + 2)
    if (tiffMagic !== 0x002A) {
      console.log('[EXIF] 无效的 TIFF 标识:', tiffMagic.toString(16))
      return null
    }

    // 获取第一个 IFD 的偏移
    const ifd0Offset = readUint32(tiffOffset + 4)
    console.log('[EXIF] IFD0 偏移:', ifd0Offset)
    
    // 先尝试从 IFD0 直接读取 DateTime
    const ifd0Date = parseIfdForDate(buffer, tiffOffset, tiffOffset + ifd0Offset, readUint16, readUint32)
    if (ifd0Date) {
      console.log('[EXIF] 从 IFD0 找到日期:', ifd0Date)
      return ifd0Date
    }
    
    // 解析 IFD0，查找 EXIF IFD 指针
    const exifIfdPointer = parseIfdForExifPointer(buffer, tiffOffset, tiffOffset + ifd0Offset, readUint16, readUint32)
    
    if (exifIfdPointer) {
      console.log('[EXIF] EXIF IFD 指针:', exifIfdPointer)
      return parseExifIfd(buffer, tiffOffset, tiffOffset + exifIfdPointer, readUint16, readUint32)
    }

    return null
  } catch (err) {
    console.error('[EXIF] TIFF 解析错误:', err)
    return null
  }
}

/**
 * 从 IFD 中直接读取日期（DateTime 标签 0x0132）
 */
function parseIfdForDate(buffer, tiffOffset, ifdOffset, readUint16, readUint32) {
  try {
    const entryCount = readUint16(ifdOffset)
    
    for (let i = 0; i < entryCount; i++) {
      const entryOffset = ifdOffset + 2 + (i * 12)
      const tag = readUint16(entryOffset)
      
      // 0x0132 = DateTime
      if (tag === 0x0132) {
        const type = readUint16(entryOffset + 2)
        const count = readUint32(entryOffset + 4)
        
        if (type === 2 && count === 20) {
          const valueOffset = readUint32(entryOffset + 8)
          const dateStr = buffer.slice(tiffOffset + valueOffset, tiffOffset + valueOffset + 19).toString('ascii')
          return formatExifDate(dateStr)
        }
      }
    }
  } catch (err) {
    console.error('[EXIF] IFD 日期解析错误:', err)
  }
  return null
}

/**
 * 解析 IFD，查找 EXIF IFD 指针
 */
function parseIfdForExifPointer(buffer, tiffOffset, ifdOffset, readUint16, readUint32) {
  try {
    const entryCount = readUint16(ifdOffset)
    console.log('[EXIF] IFD 条目数:', entryCount)
    
    for (let i = 0; i < entryCount; i++) {
      const entryOffset = ifdOffset + 2 + (i * 12)
      const tag = readUint16(entryOffset)
      
      // 0x8769 = EXIF IFD Pointer
      if (tag === 0x8769) {
        return readUint32(entryOffset + 8)
      }
    }
  } catch (err) {
    console.error('[EXIF] IFD 解析错误:', err)
  }
  
  return null
}

/**
 * 解析 EXIF IFD，查找日期标签
 */
function parseExifIfd(buffer, tiffOffset, exifOffset, readUint16, readUint32) {
  try {
    const entryCount = readUint16(exifOffset)
    console.log('[EXIF] EXIF IFD 条目数:', entryCount)
    
    let dateTimeOriginal = null
    let dateTimeDigitized = null
    
    for (let i = 0; i < entryCount; i++) {
      const entryOffset = exifOffset + 2 + (i * 12)
      const tag = readUint16(entryOffset)
      const type = readUint16(entryOffset + 2)
      const count = readUint32(entryOffset + 4)
      
      // 0x9003 = DateTimeOriginal (拍摄时间)
      // 0x9004 = DateTimeDigitized (数字化时间)
      if ((tag === 0x9003 || tag === 0x9004) && type === 2 && count === 20) {
        const valueOffset = readUint32(entryOffset + 8)
        const dateStr = buffer.slice(tiffOffset + valueOffset, tiffOffset + valueOffset + 19).toString('ascii')
        
        console.log('[EXIF] 找到日期标签:', tag.toString(16), '值:', dateStr)
        
        if (dateStr) {
          const formattedDate = formatExifDate(dateStr)
          if (formattedDate) {
            if (tag === 0x9003) {
              dateTimeOriginal = formattedDate
            } else {
              dateTimeDigitized = formattedDate
            }
          }
        }
      }
    }
    
    return dateTimeOriginal || dateTimeDigitized
  } catch (err) {
    console.error('[EXIF] EXIF IFD 解析错误:', err)
  }
  
  return null
}

/**
 * 将 EXIF 日期格式转换为 YYYY-MM-DD
 */
function formatExifDate(exifDate) {
  const match = exifDate.match(/^(\d{4}):(\d{2}):(\d{2})/)
  if (match) {
    const [, year, month, day] = match
    const y = parseInt(year)
    const m = parseInt(month)
    const d = parseInt(day)
    if (y >= 1970 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${year}-${month}-${day}`
    }
  }
  return null
}

/**
 * 云函数入口
 */
exports.main = async (event) => {
  const { fileID } = event

  if (!fileID) {
    return { success: false, error: '缺少 fileID 参数' }
  }

  console.log('[getExifDate] 开始处理:', fileID)

  try {
    // 下载图片
    const downloadRes = await cloud.downloadFile({ fileID })
    const buffer = downloadRes.fileContent
    
    console.log('[getExifDate] 文件下载成功，大小:', buffer.length, 'bytes')
    
    // 打印前 20 字节用于调试
    const headerBytes = []
    for (let i = 0; i < Math.min(20, buffer.length); i++) {
      headerBytes.push(buffer[i].toString(16).padStart(2, '0'))
    }
    console.log('[getExifDate] 文件头:', headerBytes.join(' '))

    // 检测文件格式
    const format = detectFormat(buffer)
    console.log('[getExifDate] 检测到格式:', format)

    let exifDate = null
    
    switch (format) {
      case 'jpeg':
        exifDate = extractExifDateFromJpeg(buffer)
        break
      case 'heif':
        exifDate = extractExifDateFromHeif(buffer)
        break
      case 'png':
        console.log('[getExifDate] PNG 格式通常不包含 EXIF 数据')
        break
      default:
        console.log('[getExifDate] 未知格式，尝试通用 EXIF 搜索')
        // 尝试搜索 Exif 标识
        const exifMarker = Buffer.from('Exif\0\0')
        const exifOffset = buffer.indexOf(exifMarker)
        if (exifOffset !== -1) {
          console.log('[getExifDate] 找到 Exif 标识，偏移:', exifOffset)
          exifDate = parseTiffHeader(buffer, exifOffset + 6)
        }
    }
    
    console.log('[getExifDate] 提取到的日期:', exifDate)

    return {
      success: true,
      data: {
        exifDate: exifDate,
        fileSize: buffer.length,
        format: format
      }
    }
  } catch (err) {
    console.error('[getExifDate] 错误:', err)
    return {
      success: false,
      error: err.message || '提取 EXIF 信息失败'
    }
  }
}
