import { apiClient } from '../utils/axios'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  name?: string
}

export interface ChatRequest {
  messages: ChatMessage[]
  model: string
  temperature?: number
  max_tokens?: number
  top_p?: number
  frequency_penalty?: number
  presence_penalty?: number
  stop?: string[]
  stream?: boolean
  user?: string
}

export interface ChatResponse {
  id: string
  object: 'chat.completion'
  created: number
  model: string
  choices: Array<{
    index: number
    message: ChatMessage
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface ChatChunk {
  id: string
  object: 'chat.completion.chunk'
  created: number
  model: string
  choices: Array<{
    index: number
    delta: {
      content?: string
      role?: string
    }
    finish_reason: string | null
  }>
}

export interface ApiStatus {
  status: string
  version: string
  models: string[]
  rate_limit: {
    requests_per_minute: number
    remaining_requests: number
  }
}

export interface ModelList {
  data: Array<{
    id: string
    object: string
    created: number
    owned_by: string
  }>
}

// 对话相关接口
export interface Conversation {
  id: string
  title: string
  user_id: number
  messages: ChatMessage[]
  created_at: string
  updated_at: string
  model: string
  is_active: boolean
}

export interface CreateConversationRequest {
  title: string
  model?: string
}

export interface ConversationsResponse {
  conversations: Conversation[]
  total: number
  page: number
  page_size: number
}

class ChatService {
  private baseURL = '/chat'



  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    const response = await apiClient.post('/chat/completions', request)
    return response.data
  }

  async sendMessageStream(
    request: ChatRequest,
    onChunk: (chunk: ChatChunk) => void,
    onComplete: () => void,
    onError: (error: Error) => void,
  ) {
    const requestBody = {
      ...request,
      stream: true,
    }

    try {
      const response = await apiClient.post(`/chat/completions/stream`, requestBody, {
        responseType: 'stream',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.status !== 200) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // 对于流式响应，axios返回的是ReadableStream
      const reader = (response.data as ReadableStream).getReader?.()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No reader available')
      }

      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          onComplete()
          break
        }

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmedLine = line.trim()

          if (trimmedLine === '') continue
          if (trimmedLine === '[DONE]') {
            onComplete()
            return
          }

          if (trimmedLine.startsWith('data: ')) {
            const jsonStr = trimmedLine.slice(6)

            try {
              const chunk: ChatChunk = JSON.parse(jsonStr)
              onChunk(chunk)
            } catch (error) {
              console.error('Error parsing chunk:', error)
            }
          }
        }
      }
    } catch (error) {
      onError(error instanceof Error ? error : new Error('Unknown error'))
    }
  }

  // 对话管理相关方法
  async getConversations(): Promise<ConversationsResponse> {
    const response = await apiClient.get('/chat/conversations')
    return response.data
  }

  async createConversation(request: CreateConversationRequest): Promise<Conversation> {
    const response = await apiClient.post('/chat/conversations', request)
    return response.data
  }

  async getConversation(conversationId: string): Promise<Conversation> {
    const response = await apiClient.get(`/chat/conversations/${conversationId}`)
    return response.data
  }

  async deleteConversation(conversationId: string): Promise<void> {
    await apiClient.delete(`/chat/conversations/${conversationId}`)
  }

  async testConnection(): Promise<boolean> {
    try {
      // 尝试获取对话列表来测试连接
      await apiClient.get('/chat/conversations?page=1&page_size=1')
      return true
    } catch (error) {
      console.error('Connection test failed:', error)
      return false
    }
  }
}

export const chatService = new ChatService()
