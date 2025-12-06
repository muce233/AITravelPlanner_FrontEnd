import { defineStore } from 'pinia'
import { ref } from 'vue'
import { chatService, type ChatMessage, type ChatRequest } from '../services/chatService'

export const useChatStore = defineStore('chat', () => {
  const messages = ref<ChatMessage[]>([])
  const isLoading = ref(false)
  const isStreaming = ref(false)
  const error = ref<string | null>(null)
  const currentStreamContent = ref('')

  const addMessage = (message: ChatMessage) => {
    messages.value.push(message)
  }

  const clearMessages = () => {
    messages.value = []
    currentStreamContent.value = ''
    error.value = null
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
    addMessage,
    clearMessages,
    sendMessage,
    testConnection
  }
})