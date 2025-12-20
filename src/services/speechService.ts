/**
 * 语音识别服务 - 前端调用后端语音识别API
 */
import { apiClient } from '@/utils/axios'

// 语音识别模型类型
export enum ASRModelType {
  FUN_ASR_REALTIME = 'fun-asr-realtime',
  QWEN_ASR_REALTIME = 'qwen-asr-realtime'
}

// 音频格式
export enum AudioFormat {
  PCM = 'pcm',
  OPUS = 'opus',
  WAV = 'wav',
  MP3 = 'mp3',
  AAC = 'aac',
  AMR = 'amr',
  SPEEX = 'speex'
}

// 语言代码
export enum LanguageCode {
  ZH = 'zh',
  YUE = 'yue',
  EN = 'en',
  JA = 'ja',
  DE = 'de',
  KO = 'ko',
  RU = 'ru',
  FR = 'fr',
  PT = 'pt',
  AR = 'ar',
  IT = 'it',
  ES = 'es',
  HI = 'hi',
  ID = 'id',
  TH = 'th',
  TR = 'tr',
  UK = 'uk',
  VI = 'vi'
}

// 语音识别请求接口
export interface SpeechRecognitionRequest {
  audio_data: string  // base64编码的音频数据
}

// 语音识别响应接口
export interface SpeechRecognitionResponse {
  text: string
  confidence?: number
  is_final: boolean
  model_type: ASRModelType
  language: LanguageCode
}



// 音频数据块
export interface AudioChunkData {
  session_id: string
  audio_data: string  // base64编码的音频数据
  is_final: boolean
  timestamp: number
}

// 实时语音识别响应
export interface RealtimeTranscriptionResponse {
  session_id: string
  text: string
  is_final: boolean
  confidence?: number
  model_type: ASRModelType
}

/**
 * 语音识别服务类
 */
export class SpeechRecognitionService {
  private baseURL: string
  private websocket: WebSocket | null = null
  private sessionId: string = ''
  private isConnected: boolean = false

  constructor() {
    this.baseURL = apiClient.defaults.baseURL || ''
  }

  /**
   * 连接实时语音识别WebSocket
   */
  connectRealtime(
    sessionId: string,
    onTranscription: (response: RealtimeTranscriptionResponse) => void,
    onError: (error: string) => void,
    onClose: () => void
  ): boolean {
    try {
      this.sessionId = sessionId

      // 构建WebSocket URL
      const baseURL = this.baseURL.replace('http://', '').replace('https://', '')
      const [host] = baseURL.split('/')
      const wsProtocol = this.baseURL.startsWith('https') ? 'wss:' : 'ws:'
      const wsUrl = `${wsProtocol}//${host}/api/speech/realtime/${sessionId}`

      this.websocket = new WebSocket(wsUrl)

      this.websocket.onopen = () => {
        this.isConnected = true
      }

      this.websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          if (data.error) {
            onError(data.error)
            return
          }

          // 处理转录结果
          if (data.text !== undefined) {
            onTranscription(data as RealtimeTranscriptionResponse)
          }
        } catch (error) {
          console.error('处理WebSocket消息失败:', error)
          onError('处理识别结果失败')
        }
      }

      this.websocket.onerror = (error) => {
        console.error('WebSocket连接错误:', error)
        onError('语音识别连接失败')
        this.isConnected = false
      }

      this.websocket.onclose = () => {
        this.isConnected = false
        onClose()
      }

      return true
    } catch (error) {
      console.error('连接实时语音识别失败:', error)
      onError('连接语音识别服务失败')
      return false
    }
  }

  /**
   * 发送音频数据到实时识别会话
   */
  sendAudioData(audioData: ArrayBuffer, isFinal: boolean = false): boolean {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      return false
    }

    try {
      // 将ArrayBuffer转换为base64
      const audioBase64 = btoa(
        new Uint8Array(audioData).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ''
        )
      )

      const audioChunk: AudioChunkData = {
        session_id: this.sessionId,
        audio_data: audioBase64,
        is_final: isFinal,
        timestamp: Date.now()
      }

      this.websocket.send(JSON.stringify(audioChunk))
      return true
    } catch (error) {
      console.error('发送音频数据失败:', error)
      return false
    }
  }

  /**
   * 断开实时语音识别连接
   */
  disconnectRealtime(): void {
    if (this.websocket) {
      this.websocket.close()
      this.websocket = null
    }
    this.isConnected = false
    this.sessionId = ''
  }

  /**
   * 检查WebSocket连接状态
   */
  isWebSocketConnected(): boolean {
    return this.isConnected && this.websocket?.readyState === WebSocket.OPEN
  }

  /**
   * 获取当前会话ID
   */
  getCurrentSessionId(): string {
    return this.sessionId
  }

  /**
   * 获取服务状态
   */
  async getServiceStatus(): Promise<{
    active_sessions: number
    expired_sessions_cleaned: number
    service_status: string
  }> {
    try {
      const response = await apiClient.get('/api/speech/status')
      return response.data
    } catch (error) {
      console.error('获取服务状态失败:', error)
      throw new Error('获取服务状态失败')
    }
  }
}

// 创建全局语音识别服务实例
export const speechService = new SpeechRecognitionService()

export default speechService
