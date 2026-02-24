/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

// Web Speech API 类型声明
interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  isFinal: boolean
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message: string
}

interface SpeechRecognition extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null
  onend: ((this: SpeechRecognition, ev: Event) => any) | null
}

declare var SpeechRecognition: {
  prototype: SpeechRecognition
  new(): SpeechRecognition
}

interface Window {
  SpeechRecognition: typeof SpeechRecognition
  webkitSpeechRecognition: typeof SpeechRecognition
}

declare module '@cloudbase/js-sdk' {
  interface AuthInstance {
    signInWithOtp(options: { phone?: string; email?: string }): Promise<{ data: any; error: any }>
    signInWithOAuth(options: { provider: string }): Promise<{ data: any; error: any }>
    signInAnonymously(): Promise<{ data: any; error: any }>
    signInWithPassword(options: { username?: string; email?: string; phone?: string; password: string }): Promise<{ data: any; error: any }>
    signUp(options: any): Promise<{ data: any; error: any }>
    signOut(): Promise<{ data: any; error: any }>
    getUser(): Promise<{ data: any; error: any }>
    getSession(): Promise<{ data: any; error: any }>
    updateUser(options: any): Promise<{ data: any; error: any }>
    refreshUser(): Promise<{ data: any; error: any }>
    resetPasswordForOld(options: any): Promise<{ data: any; error: any }>
    reauthenticate(): Promise<{ data: any; error: any }>
    linkIdentity(options: any): Promise<{ data: any; error: any }>
    getUserIdentities(): Promise<{ data: any; error: any }>
    unlinkIdentity(options: any): Promise<{ data: any; error: any }>
    deleteMe(options: any): Promise<{ data: any; error: any }>
    onAuthStateChange(callback: (event: string, session: any, info?: any) => void): { data: any; error: any }
  }

  interface QueryCommand {
    gt(value: any): any
    gte(value: any): any
    lt(value: any): any
    lte(value: any): any
    eq(value: any): any
    neq(value: any): any
    in(value: any[]): any
    nin(value: any[]): any
    inc(value: number): any
    push(value: any[]): any
    pull(value: any): any
    set(value: any): any
    remove(): any
  }

  interface CollectionReference {
    doc(id: string): DocumentReference
    where(conditions: Record<string, any>): Query
    add(data: any): Promise<any>
    orderBy(field: string, direction: 'asc' | 'desc'): Query
    limit(count: number): Query
    skip(count: number): Query
    field(projection: Record<string, boolean>): Query
    get(): Promise<any>
  }

  interface DocumentReference {
    get(): Promise<any>
    set(data: any): Promise<any>
    update(data: any): Promise<any>
    remove(): Promise<any>
  }

  interface Query {
    where(conditions: Record<string, any>): Query
    orderBy(field: string, direction: 'asc' | 'desc'): Query
    limit(count: number): Query
    skip(count: number): Query
    field(projection: Record<string, boolean>): Query
    get(): Promise<any>
    update(data: any): Promise<any>
    remove(): Promise<any>
  }

  interface DatabaseInstance {
    collection(name: string): CollectionReference
    command: QueryCommand
  }

  interface CloudbaseApp {
    auth: AuthInstance
    database(): DatabaseInstance
    callFunction(options: { name: string; data?: Record<string, any>; parse?: boolean }): Promise<{ requestId: string; result: any }>
    uploadFile(options: any): Promise<any>
    getTempFileURL(options: any): Promise<any>
    deleteFile(options: any): Promise<any>
    downloadFile(options: any): Promise<any>
  }

  interface InitOptions {
    env: string
    region?: string
    accessKey?: string
    auth?: { detectSessionInUrl?: boolean }
  }

  const cloudbase: {
    init(options: InitOptions): CloudbaseApp
  }
  export default cloudbase
}
