/**
 * 轻量级 EXIF 日期解析器
 * 从 JPEG 图片的 ArrayBuffer 中提取拍摄日期
 * 
 * 参考 EXIF 规范：https://www.exif.org/Exif2-2.PDF
 */

/**
 * 从图片 ArrayBuffer 中提取 EXIF 拍摄日期
 * @param buffer 图片的 ArrayBuffer
 * @returns 拍摄日期字符串（YYYY-MM-DD 格式），如果无法提取则返回 null
 */
export function extractExifDate(buffer: ArrayBuffer): string | null {
  try {
    const view = new DataView(buffer)
    
    console.log('[EXIF] 开始解析，文件大小:', buffer.byteLength, 'bytes')
    console.log('[EXIF] 文件头两个字节:', view.getUint8(0).toString(16), view.getUint8(1).toString(16))
    
    // 检查 JPEG 标记 (SOI: Start Of Image) - 0xFFD8
    if (view.getUint16(0) !== 0xFFD8) {
      console.log('[EXIF] 不是有效的 JPEG 文件（头部不是 FFD8）')
      return null
    }

    let offset = 2
    const length = view.byteLength

    while (offset < length - 4) {
      // 读取标记
      if (view.getUint8(offset) !== 0xFF) {
        console.log('[EXIF] 在 offset', offset, '处无效的标记')
        offset++
        continue
      }

      const marker = view.getUint8(offset + 1)
      console.log('[EXIF] 发现标记:', marker.toString(16), '在 offset:', offset)

      // APP1 标记 (0xE1) 包含 EXIF 数据
      if (marker === 0xE1) {
        const segmentLength = view.getUint16(offset + 2)
        console.log('[EXIF] APP1 段长度:', segmentLength)
        
        // 检查 "Exif\0\0" 标识
        const exifHeader = String.fromCharCode(
          view.getUint8(offset + 4),
          view.getUint8(offset + 5),
          view.getUint8(offset + 6),
          view.getUint8(offset + 7)
        )
        
        console.log('[EXIF] APP1 标识:', exifHeader)
        
        if (exifHeader === 'Exif') {
          const tiffOffset = offset + 10 // TIFF header 开始位置
          const result = parseTiffHeader(view, tiffOffset)
          console.log('[EXIF] TIFF 解析结果:', result)
          return result
        }
      }

      // 跳过其他段
      if (marker === 0xD8 || marker === 0xD9) {
        // SOI 或 EOI
        offset += 2
      } else if (marker >= 0xE0 && marker <= 0xEF) {
        // APPn 段
        const segmentLength = view.getUint16(offset + 2)
        offset += 2 + segmentLength
      } else if (marker === 0xFE) {
        // COM 段
        const segmentLength = view.getUint16(offset + 2)
        offset += 2 + segmentLength
      } else if (marker >= 0xC0 && marker <= 0xCF && marker !== 0xC4 && marker !== 0xC8 && marker !== 0xCC) {
        // SOF 段
        const segmentLength = view.getUint16(offset + 2)
        offset += 2 + segmentLength
      } else if (marker === 0xDA) {
        // SOS - 图像数据开始，停止搜索
        console.log('[EXIF] 到达 SOS 段，停止搜索')
        break
      } else {
        // 其他段
        if (offset + 3 < length) {
          const segmentLength = view.getUint16(offset + 2)
          offset += 2 + segmentLength
        } else {
          break
        }
      }
    }

    console.log('[EXIF] 未找到 EXIF 数据')
    return null
  } catch (err) {
    console.error('[EXIF] 解析错误:', err)
    return null
  }
}

/**
 * 解析 TIFF 头部，查找日期标签
 */
function parseTiffHeader(view: DataView, tiffOffset: number): string | null {
  // 读取字节序（II = Little Endian, MM = Big Endian）
  const byteOrder = view.getUint16(tiffOffset)
  const littleEndian = byteOrder === 0x4949 // 'II'

  // 检查 TIFF 标识 (0x002A)
  const tiffMagic = view.getUint16(tiffOffset + 2, littleEndian)
  if (tiffMagic !== 0x002A) {
    console.log('[EXIF] 无效的 TIFF 标识')
    return null
  }

  // 获取第一个 IFD 的偏移
  const ifd0Offset = view.getUint32(tiffOffset + 4, littleEndian)
  
  // 解析 IFD0
  const exifIfdPointer = parseIfd(view, tiffOffset, tiffOffset + ifd0Offset, littleEndian)
  
  if (exifIfdPointer) {
    // 解析 EXIF IFD
    return parseExifIfd(view, tiffOffset, tiffOffset + exifIfdPointer, littleEndian)
  }

  return null
}

/**
 * 解析 IFD，查找 EXIF IFD 指针
 */
function parseIfd(view: DataView, tiffOffset: number, ifdOffset: number, littleEndian: boolean): number | null {
  try {
    const entryCount = view.getUint16(ifdOffset, littleEndian)
    
    for (let i = 0; i < entryCount; i++) {
      const entryOffset = ifdOffset + 2 + (i * 12)
      const tag = view.getUint16(entryOffset, littleEndian)
      
      // 0x8769 = EXIF IFD Pointer
      if (tag === 0x8769) {
        return view.getUint32(entryOffset + 8, littleEndian)
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
function parseExifIfd(view: DataView, tiffOffset: number, exifOffset: number, littleEndian: boolean): string | null {
  try {
    const entryCount = view.getUint16(exifOffset, littleEndian)
    
    // 优先级：DateTimeOriginal > DateTimeDigitized > DateTime
    let dateTimeOriginal: string | null = null
    let dateTimeDigitized: string | null = null
    
    for (let i = 0; i < entryCount; i++) {
      const entryOffset = exifOffset + 2 + (i * 12)
      const tag = view.getUint16(entryOffset, littleEndian)
      const type = view.getUint16(entryOffset + 2, littleEndian)
      const count = view.getUint32(entryOffset + 4, littleEndian)
      
      // 0x9003 = DateTimeOriginal (拍摄时间)
      // 0x9004 = DateTimeDigitized (数字化时间)
      // 0x0132 = DateTime (修改时间，在 IFD0 中)
      if ((tag === 0x9003 || tag === 0x9004) && type === 2 && count === 20) {
        const valueOffset = view.getUint32(entryOffset + 8, littleEndian)
        const dateStr = readString(view, tiffOffset + valueOffset, 19)
        
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
    
    // 优先返回拍摄时间
    return dateTimeOriginal || dateTimeDigitized
  } catch (err) {
    console.error('[EXIF] EXIF IFD 解析错误:', err)
  }
  
  return null
}

/**
 * 从 DataView 读取字符串
 */
function readString(view: DataView, offset: number, length: number): string | null {
  try {
    let str = ''
    for (let i = 0; i < length; i++) {
      const charCode = view.getUint8(offset + i)
      if (charCode === 0) break
      str += String.fromCharCode(charCode)
    }
    return str
  } catch (err) {
    return null
  }
}

/**
 * 将 EXIF 日期格式转换为 YYYY-MM-DD
 * EXIF 日期格式: "2026:02:22 14:30:15"
 */
function formatExifDate(exifDate: string): string | null {
  // 格式：YYYY:MM:DD HH:MM:SS
  const match = exifDate.match(/^(\d{4}):(\d{2}):(\d{2})/)
  if (match) {
    const [, year, month, day] = match
    // 验证日期有效性
    const y = parseInt(year)
    const m = parseInt(month)
    const d = parseInt(day)
    if (y >= 1970 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${year}-${month}-${day}`
    }
  }
  return null
}
