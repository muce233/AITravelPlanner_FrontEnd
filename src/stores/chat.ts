import { defineStore } from 'pinia'
import { ref } from 'vue'
import { chatService, type ChatMessage, type ChatRequest, type ConversationBasicInfo, type Conversation } from '../services/chatService'

export const useChatStore = defineStore('chat', () => {
  const messages = ref<ChatMessage[]>([])
  const isLoading = ref(false)
  const isStreaming = ref(false)
  const error = ref<string | null>(null)
  const currentStreamContent = ref('')

  // 对话管理相关状态
  const conversations = ref<ConversationBasicInfo[]>([])
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

  // 获取对话列表（只包含基本信息）
  const getConversations = async (): Promise<ConversationBasicInfo[]> => {
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

      // 为新对话设置初始预览文本
      if (conversation) {
        const previewText = title.slice(0, 30)
        conversation.latest_message_preview = title.length > 30
          ? previewText + '...'
          : previewText
      }

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

  // 本地更新对话列表排序和预览
  const updateConversationOrder = (conversationId: string) => {
    const index = conversations.value.findIndex(c => c.id === conversationId)
    if (index !== -1) {
      // 更新对话的更新时间
      const conversation = conversations.value[index]
      if (conversation) {
        conversation.updated_at = new Date().toISOString()

        // 更新对话预览文本
        if (messages.value.length > 0) {
          const latestMessage = messages.value[messages.value.length - 1]
          if (latestMessage) {
            // 截取最新消息的前30个字符作为预览
            const previewText = latestMessage.content.slice(0, 30)
            conversation.latest_message_preview = latestMessage.content.length > 30
              ? previewText + '...'
              : previewText
          }
        }

        // 将该对话移到列表开头
        conversations.value.splice(index, 1)
        conversations.value.unshift(conversation)
      }
    }
  }

  const sendMessage = async (content: string) => {
    if (!content.trim()) return

    const userMessage: ChatMessage = {
      role: 'user',
      content: content.trim()
    }

    addMessage(userMessage)

    // 用户消息发送后立即更新对话列表预览
    if (currentConversation.value) {
      updateConversationOrder(currentConversation.value.id)
    }

    isLoading.value = true
    error.value = null

    const requestMessages: ChatMessage[] = [...messages.value]

    isStreaming.value = true
    currentStreamContent.value = ''

    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: ''
    }

    addMessage(assistantMessage)

    const request: ChatRequest = {
      messages: requestMessages
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

          // 本地更新当前对话的排序
          if (currentConversation.value) {
            updateConversationOrder(currentConversation.value.id)
          }
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
    testConnection,
    updateConversationOrder
  }
})
