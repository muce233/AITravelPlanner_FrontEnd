import { apiClient, streamClient } from '../utils/axios'

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

    // 使用统一的流式客户端
    await streamClient.post<ChatChunk>(
      '/chat/completions/stream',
      requestBody,
      onChunk,
      onComplete,
      onError
    )
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
