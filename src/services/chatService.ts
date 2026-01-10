import { apiClient, streamClient } from '../utils/axios'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  message_type?: 'normal' | 'tool_call_status' | 'tool_result'
  name?: string
}

export interface ChatRequest {
  messages: ChatMessage[]
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
export interface ConversationBasicInfo {
  id: string
  title: string
  user_id: number
  created_at: string
  updated_at: string
  model: string
  is_active: boolean
  latest_message_preview?: string
}

export interface Conversation extends ConversationBasicInfo {
  messages: ChatMessage[]
}

export interface CreateConversationRequest {
  title: string
}

export interface ConversationsResponse {
  conversations: ConversationBasicInfo[]
  total: number
  page: number
  page_size: number
}

// 工具调用事件接口
export interface MessageCreateEvent {
  type: 'message_create'
  message_id: string
  created_at: string
}

export interface MessageChunkEvent {
  type: 'message_chunk'
  message_id: string
  index: number
  content: string
}

export interface ToolCallEvent {
  type: 'tool_call'
  status: 'calling'
  content: string
}

export interface ToolResultEvent {
  type: 'tool_result'
  status: 'success' | 'failed'
  content: string
}

export type StreamEvent = MessageCreateEvent | MessageChunkEvent | ToolCallEvent | ToolResultEvent

class ChatService {
  private baseURL = '/chat'



  async sendMessageStream(
    request: ChatRequest,
    onEvent: (event: StreamEvent) => void,
    onComplete: () => void,
    onError: (error: Error) => void,
  ) {
    // 使用统一的流式客户端
    await streamClient.post<StreamEvent>(
      '/chat/completions/stream',
      request,
      onEvent,
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

  async getConversationMessages(conversationId: string): Promise<ChatMessage[]> {
    const response = await apiClient.get(`/chat/conversations/${conversationId}/messages`)
    return response.data
  }

  async deleteConversation(conversationId: string): Promise<void> {
    await apiClient.delete(`/chat/conversations/${conversationId}`)
  }
}

export const chatService = new ChatService()
