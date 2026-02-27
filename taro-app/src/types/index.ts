/** AI 提供商 */
export type AiProvider = 'qwen'

/** AI 提供商配置 */
export interface AiProviderConfig {
  label: string
  apiUrl: string
  models: { text: string; vision: string }
  keyPrefix: string
  placeholder: string
}

/** 提供商配置映射 */
export const AI_PROVIDER_MAP: Record<AiProvider, AiProviderConfig> = {
  qwen: {
    label: '通义千问',
    apiUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    models: { text: 'qwen-vl-max', vision: 'qwen-vl-max' },
    keyPrefix: 'sk-',
    placeholder: 'sk-...'
  }
}

/** 记录类型（expense 保留用于兼容旧数据） */
export type RecordType = 'medical' | 'diet' | 'growth' | 'grooming' | 'expense'

/** 记录状态 */
export type RecordStatus = 'pending' | 'confirmed'

/** AI 识别流程状态 */
export type RecognizeStatus = 'idle' | 'uploading' | 'recognizing' | 'done' | 'error'

/** 主人信息 */
export interface PetOwner {
  name: string
  avatar: string
}

/** 宠物信息 */
export interface Pet {
  _id?: string
  name: string
  breed: string
  birthday: string
  avatar: string
  owners?: PetOwner[]
  ownerId: string
  createdAt: number
  /** 通义千问 API Key（云端持久化） */
  qwenApiKey?: string
}

/** 记录条目 */
export interface PetRecord {
  _id?: string
  petId: string
  type: RecordType
  title: string
  content: string
  eventDate: string
  imageUrl?: string
  source?: string
  aiRawData?: Record<string, unknown>
  status: RecordStatus
  createdAt: number
}

/** 日程 */
export interface Schedule {
  _id?: string
  petId: string
  recordId?: string
  title: string
  date: string
  time?: string
  reminder?: boolean
  status: 'upcoming' | 'done'
}

/** AI 识别结果 */
export interface RecognizeResult {
  type: RecordType
  title: string
  content: string
  eventDate: string
  confidence: number
  schedules?: Array<{
    title: string
    date: string
    time?: string
  }>
}

/** 记录类型配置 */
export interface RecordTypeConfig {
  label: string
  color: string
  lightColor: string
  icon: string
}

/** 类型配置映射 */
export const RECORD_TYPE_MAP: Record<RecordType, RecordTypeConfig> = {
  medical: {
    label: '医疗',
    color: '#E57373',
    lightColor: '#FFF5F5',
    icon: 'heart-pulse'  // 使用图标名称替代 emoji
  },
  diet: {
    label: '饮食',
    color: '#FFB74D',
    lightColor: '#FFF8F0',
    icon: 'utensils'
  },
  growth: {
    label: '成长',
    color: '#81C784',
    lightColor: '#F0FFF0',
    icon: 'heart'
  },
  grooming: {
    label: '美容',
    color: '#BA68C8',
    lightColor: '#FBF0FF',
    icon: 'scissors'
  },
  expense: {
    label: '开销',
    color: '#64B5F6',
    lightColor: '#F0F7FF',
    icon: 'wallet'
  }
}
