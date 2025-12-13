import { defineStore } from 'pinia'
import { ref } from 'vue'
import { chatService, type ChatMessage, type ChatRequest } from '../services/chatService'

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

export const useChatStore = defineStore('chat', () => {
  const messages = ref<ChatMessage[]>([])
  const isLoading = ref(false)
  const isStreaming = ref(false)
  const error = ref<string | null>(null)
  const currentStreamContent = ref('')

  // 对话管理相关状态
  const conversations = ref<Conversation[]>([])
  const currentConversation = ref<Conversation | null>(null)
  const isConversationLoading = ref(false)

  const addMessage = (message: ChatMessage) => {
    messages.value.push(message)
  }

  const clearMessages = () => {
    messages.value = []
    currentStreamContent.value = ''
    error.value = null
  }

  // 设置当前对话
  const setCurrentConversation = (conversation: Conversation) => {
    currentConversation.value = conversation
    messages.value = conversation.messages || []
  }

  // 获取对话列表
  const getConversations = async (): Promise<Conversation[]> => {
    try {
      isConversationLoading.value = true
      const response = await chatService.getConversations()
      conversations.value = response.conversations || []
      return conversations.value
    } catch (err) {
      error.value = err instanceof Error ? err.message : '获取对话列表失败'
      return []
    } finally {
      isConversationLoading.value = false
    }
  }

  // 创建新对话
  const createConversation = async (title: string): Promise<Conversation> => {
    try {
      const conversation = await chatService.createConversation({ title })
      conversations.value.unshift(conversation)
      currentConversation.value = conversation
      messages.value = []
      return conversation
    } catch (err) {
      error.value = err instanceof Error ? err.message : '创建对话失败'
      throw err
    }
  }

  // 获取对话详情
  const getConversation = async (conversationId: string): Promise<Conversation> => {
    try {
      const conversation = await chatService.getConversation(conversationId)
      return conversation
    } catch (err) {
      error.value = err instanceof Error ? err.message : '获取对话详情失败'
      throw err
    }
  }

  // 删除对话
  const deleteConversation = async (conversationId: string): Promise<void> => {
    try {
      await chatService.deleteConversation(conversationId)
      conversations.value = conversations.value.filter(c => c.id !== conversationId)

      if (currentConversation.value?.id === conversationId) {
        currentConversation.value = null
        messages.value = []
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '删除对话失败'
      throw err
    }
  }

  const sendMessage = async (content: string, useStream = true) => {
    if (!content.trim()) return

    const userMessage: ChatMessage = {
      role: 'user',
      content: content.trim()
    }

    addMessage(userMessage)
    isLoading.value = true
    error.value = null

    const requestMessages: ChatMessage[] = [...messages.value]

    if (useStream) {
      isStreaming.value = true
      currentStreamContent.value = ''

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: ''
      }

      addMessage(assistantMessage)

      const request: ChatRequest = {
        messages: requestMessages,
        model: 'chat-model',
        temperature: 0.7,
        max_tokens: 2048,
        stream: true
      }

      try {
        await chatService.sendMessageStream(
          request,
          (chunk) => {
                  if (chunk.choices[0]?.delta?.content) {
                    currentStreamContent.value += chunk.choices[0].delta.content
                    const lastMessage = messages.value[messages.value.length - 1]
                    if (lastMessage) {
                      lastMessage.content = currentStreamContent.value
                    }
                  }
                },
          () => {
            isStreaming.value = false
            isLoading.value = false
            currentStreamContent.value = ''
          },
          (err) => {
            error.value = err.message
            isLoading.value = false
            isStreaming.value = false
            currentStreamContent.value = ''
            // 移除空的助手消息
            if (messages.value[messages.value.length - 1]?.content === '') {
              messages.value.pop()
            }
          }
        )
      } catch (err) {
        error.value = err instanceof Error ? err.message : '发送消息失败'
        isLoading.value = false
        isStreaming.value = false
        currentStreamContent.value = ''
        // 移除空的助手消息
        if (messages.value[messages.value.length - 1]?.content === '') {
          messages.value.pop()
        }
      }
    } else {
      const request: ChatRequest = {
        messages: requestMessages,
        model: 'chat-model',
        temperature: 0.7,
        max_tokens: 2048,
        stream: false
      }

      try {
        const response = await chatService.sendMessage(request)
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: response.choices[0]?.message?.content || '抱歉，我没有理解您的问题。'
        }

        addMessage(assistantMessage)
      } catch (err) {
        error.value = err instanceof Error ? err.message : '发送消息失败'
      } finally {
        isLoading.value = false
      }
    }
  }

  const testConnection = async (): Promise<boolean> => {
    try {
      return await chatService.testConnection()
    } catch (err) {
      error.value = err instanceof Error ? err.message : '连接测试失败'
      return false
    }
  }

  return {
    messages,
    isLoading,
    isStreaming,
    error,
    currentStreamContent,
    conversations,
    currentConversation,
    isConversationLoading,
    addMessage,
    clearMessages,
    setCurrentConversation,
    getConversations,
    createConversation,
    getConversation,
    deleteConversation,
    sendMessage,
    testConnection
  }
})
