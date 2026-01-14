import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { chatService, type ChatMessage, type ChatRequest, type ConversationBasicInfo, type Conversation } from '../services/chatService'

export const useChatStore = defineStore('chat', () => {
  const messages = ref<ChatMessage[]>([])
  const isLoading = ref(false)
  const isStreaming = ref(false)
  const error = ref<string | null>(null)
  const currentStreamContent = ref('')

  // 当前正在处理的AI消息ID
  const currentMessageId = ref<string | null>(null)
  // 当前正在处理的工具调用消息ID
  const currentToolCallMessageId = ref<string | null>(null)
  // 工具调用状态映射：messageId -> toolCallStatus
  const toolCallStatusMap = ref<{ [messageId: string]: { [key: string]: { status: 'calling' | 'success' | 'failed', content: string } } }>({})

  // 对话管理相关状态
  const conversations = ref<ConversationBasicInfo[]>([])
  const currentConversation = ref<Conversation | null>(null)
  const isConversationLoading = ref(false)

  const addMessage = (message: ChatMessage) => {
    messages.value.push(message)
  }

  // 合并消息：将相同message_id的消息合并
  const mergeMessage = (messageId: string, content: string) => {
    const message = messages.value.find(m => m.id === messageId)
    if (message) {
      message.content = content
    }
  }

  // 添加或更新工具调用状态
  const updateToolCallStatus = (messageId: string, toolName: string, status: 'calling' | 'success' | 'failed', content: string) => {
    if (!toolCallStatusMap.value[messageId]) {
      toolCallStatusMap.value[messageId] = {}
    }
    toolCallStatusMap.value[messageId][toolName] = { status, content }
  }

  // 获取指定消息的工具调用状态
  const getToolCallStatus = (messageId: string) => {
    return toolCallStatusMap.value[messageId] || {}
  }

  const clearMessages = () => {
    messages.value = []
    currentStreamContent.value = ''
    error.value = null
  }

  // 设置消息列表
  const setMessages = (newMessages: ChatMessage[]) => {
    messages.value = newMessages
    initializeToolCallStatusMap(newMessages)
  }

  // 设置当前对话
  const setCurrentConversation = (conversation: Conversation) => {
    currentConversation.value = conversation
    messages.value = conversation.messages || []

    // 初始化工具调用状态映射
    initializeToolCallStatusMap(messages.value)
  }

  // 初始化工具调用状态映射（用于历史消息）
  const initializeToolCallStatusMap = (messages: ChatMessage[]) => {
    // 清空现有的状态映射
    toolCallStatusMap.value = {}

    // 遍历消息，提取工具调用信息
    for (const message of messages) {
      if (message.message_type === 'tool_call_status') {
        try {
          // 解析工具调用消息的 content（JSON 格式）
          const contentData = JSON.parse(message.content)
          if (contentData.tool_calls && Array.isArray(contentData.tool_calls)) {
            for (const toolCall of contentData.tool_calls) {
              if (toolCall.function && toolCall.function.name) {
                const toolName = toolCall.function.name
                // 历史消息中的工具调用状态默认为 success
                updateToolCallStatus(message.id, toolName, 'success', `正在调用工具: ${toolName}`)
              }
            }
          }
        } catch (e) {
          console.error('解析工具调用消息失败:', e)
        }
      } else if (message.message_type === 'tool_result') {
        try {
          // 解析工具结果消息的 content（JSON 格式）
          const contentData = JSON.parse(message.content)
          if (contentData.tool_name) {
            const toolName = contentData.tool_name
            const status = contentData.success ? 'success' : 'failed'
            const statusText = contentData.success ? `工具 ${toolName} 调用完成` : `工具 ${toolName} 调用失败`
            updateToolCallStatus(message.id, toolName, status, statusText)
          }
        } catch (e) {
          console.error('解析工具结果消息失败:', e)
        }
      }
    }
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

  // 直接获取对话的消息列表（从conversation_messages表）
  const getConversationMessages = async (conversationId: string): Promise<ChatMessage[]> => {
    try {
      const messages = await chatService.getConversationMessages(conversationId)
      return messages
    } catch (err) {
      error.value = err instanceof Error ? err.message : '获取对话消息失败'
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

  const clearConversationMessages = async (conversationId: string): Promise<void> => {
    try {
      await chatService.clearConversationMessages(conversationId)

      if (currentConversation.value?.id === conversationId) {
        messages.value = []
        clearMessages()
        initializeToolCallStatusMap([])
      }

      const index = conversations.value.findIndex(c => c.id === conversationId)
      if (index !== -1) {
        const conversation = conversations.value[index]
        if (conversation) {
          conversation.updated_at = new Date().toISOString()
          conversation.latest_message_preview = ''
        }
      }

      ElMessage.success('对话消息已清空')
    } catch (err) {
      error.value = err instanceof Error ? err.message : '清空对话消息失败'
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
            let previewText = latestMessage.content.slice(0, 30)
            previewText = latestMessage.content.length > 30
              ? previewText + '...'
              : previewText
            // 如果是第一次消息，更新对话标题
            console.log("messages.value.length",messages.value.length)
            if(messages.value.length===1){
              conversation.title = previewText
              console.log("conversation.title", conversation.title )
            }
            // 更新对话最新消息预览
            conversation.latest_message_preview = previewText
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
      id: crypto.randomUUID(),
      role: 'user',
      content: content.trim()
    }

    addMessage(userMessage)
    // 用户发送了信息 本地更新当前对话的排序
    if (currentConversation.value) {
      updateConversationOrder(currentConversation.value.id)
    }

    isLoading.value = true
    error.value = null

    const requestMessages: ChatMessage[] = messages.value.filter(msg => msg.role !== 'tool')

    isStreaming.value = true
    currentStreamContent.value = ''

    const request: ChatRequest = {
      messages: requestMessages
    }

    try {
      await chatService.sendMessageStream(
        request,
        (event) => {
          // 处理message_create事件
          if (event.type === 'message_create') {
            currentMessageId.value = event.message_id
            const assistantMessage: ChatMessage = {
              id: event.message_id,
              role: 'assistant',
              content: '',
              message_type: 'normal'
            }
            addMessage(assistantMessage)
            currentStreamContent.value = ''
          }
          // 处理message_chunk事件
          else if (event.type === 'message_chunk') {
            if (currentMessageId.value) {
              currentStreamContent.value += event.content
              mergeMessage(currentMessageId.value, currentStreamContent.value)
            }
          }
          // 处理tool_call事件
          else if (event.type === 'tool_call') {
            const toolName = event.content.replace('正在调用工具: ', '')
            const toolCallMessageId = crypto.randomUUID()
            currentToolCallMessageId.value = toolCallMessageId

            // 创建工具调用状态消息
            const toolCallMessage: ChatMessage = {
              id: toolCallMessageId,
              role: 'assistant',
              content: event.content,
              message_type: 'tool_call_status'
            }
            addMessage(toolCallMessage)

            // 更新工具调用状态
            updateToolCallStatus(toolCallMessageId, toolName, 'calling', event.content)
          }
          // 处理tool_result事件
          else if (event.type === 'tool_result') {
            const toolName = event.content.replace('工具 ', '').replace(' 调用完成', '')
            const toolResultMessageId = crypto.randomUUID()

            // 创建工具结果消息
            const toolResultMessage: ChatMessage = {
              id: toolResultMessageId,
              role: 'tool',
              content: event.content,
              message_type: 'tool_result'
            }
            addMessage(toolResultMessage)

            // 更新工具调用状态：同时更新tool_call消息和tool_result消息的状态
            if (currentToolCallMessageId.value) {
              updateToolCallStatus(currentToolCallMessageId.value, toolName, event.status, event.content)
            }
            // 也为tool_result消息创建状态映射，以便显示
            updateToolCallStatus(toolResultMessageId, toolName, event.status, event.content)
          }
        },
        () => {
          isStreaming.value = false
          isLoading.value = false
          currentStreamContent.value = ''
          currentMessageId.value = null

          // 流式响应后 本地更新当前对话的排序
          if (currentConversation.value) {
            updateConversationOrder(currentConversation.value.id)
          }
        },
        (err) => {
          error.value = err.message
          isLoading.value = false
          isStreaming.value = false
          currentStreamContent.value = ''
          currentMessageId.value = null
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
      currentMessageId.value = null
      // 移除空的助手消息
      if (messages.value[messages.value.length - 1]?.content === '') {
        messages.value.pop()
      }
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
    currentMessageId,
    toolCallStatusMap,
    addMessage,
    clearMessages,
    setMessages,
    mergeMessage,
    updateToolCallStatus,
    getToolCallStatus,
    setCurrentConversation,
    initializeToolCallStatusMap,
    getConversations,
    createConversation,
    getConversation,
    getConversationMessages,
    deleteConversation,
    clearConversationMessages,
    sendMessage,
    updateConversationOrder
  }
})
