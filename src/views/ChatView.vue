<template>
  <div class="chat-container">
    <!-- 移动端菜单按钮 -->
    <div class="mobile-menu-button" v-if="isMobile" @click="showConversationList = !showConversationList">
      <el-icon><More /></el-icon>
    </div>

    <!-- 对话列表侧边栏 -->
    <div class="conversation-sidebar" :class="{ 'mobile-visible': showConversationList }">
      <div class="sidebar-header">
        <h2>对话列表</h2>
        <el-button type="primary" size="small" @click="handleCreateConversation">
          <el-icon><Plus /></el-icon>
          新对话
        </el-button>
      </div>

      <div class="conversation-list">
        <div
          v-for="conversation in conversations"
          :key="conversation.id"
          :class="['conversation-item', { active: currentConversationId === conversation.id }]"
          @click="handleSelectConversation(conversation.id)"
        >
          <div class="conversation-content">
            <div class="conversation-title">{{ conversation.title }}</div>
            <div class="conversation-preview">{{ getPreviewText(conversation) }}</div>
            <div class="conversation-time">{{ formatTime(conversation.updated_at) }}</div>
          </div>
          <div class="conversation-actions" @click.stop="handleDeleteConversation(conversation.id)">
            <el-icon class="delete-icon"><Close /></el-icon>
          </div>
        </div>

        <div v-if="conversations.length === 0" class="empty-conversations">
          <el-empty description="暂无对话" />
        </div>
      </div>
    </div>

    <!-- 遮罩层（移动端） -->
    <div v-if="isMobile && showConversationList" class="sidebar-overlay" @click="showConversationList = false"></div>

    <!-- 聊天主体区域 -->
    <div class="chat-main">
      <!-- 页面标题 -->
      <div class="chat-header">
        <h1>AI聊天助手</h1>
        <p>与智能助手进行实时对话，获取专业建议和帮助</p>
      </div>

      <!-- 消息列表 -->
      <div class="messages-container" ref="messagesContainer">
        <div v-if="messages.length === 0" class="empty-state">
          <el-empty description="开始对话吧！" />
        </div>

        <div v-else class="messages-list">
          <div
            v-for="(group, groupIndex) in mergedMessages"
            :key="groupIndex"
            :class="['message-item', group.role]"
          >
            <!-- 用户消息 -->
            <div v-if="group.role === 'user'" class="message user-message">
              <div v-if="shouldShowAvatar(groupIndex, 'user')" class="message-avatar">
                <el-avatar :size="32" :src="userStore.user?.avatar" />
              </div>
              <div class="message-content">
                <div class="message-bubble">
                  {{ group.messages[0]?.content }}
                </div>
                <div class="message-time">
                  {{ formatMessageTime() }}
                </div>
              </div>
            </div>

            <!-- AI助手消息（可能包含多条合并的消息） -->
            <div v-else class="message assistant-message">
              <div v-if="shouldShowAvatar(groupIndex, 'assistant')" class="message-avatar">
                <el-avatar :size="32" class="ai-avatar">
                  <el-icon><ChatDotRound /></el-icon>
                </el-avatar>
              </div>
              <div class="message-content">
                <div class="message-bubble">
                  <template v-for="(msg, msgIndex) in group.messages" :key="msg.id">
                    <!-- 普通文本消息 -->
                    <div
                      v-if="msg.message_type === 'normal' || !msg.message_type"
                      class="message-text-block"
                    >
                      <div
                        v-if="isStreaming && msg.id === chatStore.currentMessageId"
                        class="streaming-content"
                      >
                        {{ msg.content }}
                        <span class="typing-indicator"></span>
                      </div>
                      <div v-else>
                        {{ msg.content }}
                      </div>
                    </div>

                    <!-- 工具调用状态消息 -->
                    <div
                      v-else-if="msg.message_type === 'tool_call_status' && shouldShowToolCallStatus(msg.id)"
                      class="tool-call-status"
                    >
                      <div
                        v-for="(status, toolName) in getMessageToolCallStatus(msg.id)"
                        :key="toolName"
                        :class="['tool-call-item', status.status]"
                      >
                        <el-icon v-if="status.status === 'calling'" class="is-loading"><Loading /></el-icon>
                        <el-icon v-else-if="status.status === 'success'"><CircleCheck /></el-icon>
                        <el-icon v-else><CircleClose /></el-icon>
                        <span>{{ status.content }}</span>
                      </div>
                    </div>

                    <!-- 工具结果消息 -->
                    <div
                      v-else-if="msg.message_type === 'tool_result'"
                      class="tool-result-block"
                    >
                      <div
                        v-for="(status, toolName) in getMessageToolCallStatus(msg.id)"
                        :key="toolName"
                        :class="['tool-call-item', status.status]"
                      >
                        <el-icon v-if="status.status === 'calling'" class="is-loading"><Loading /></el-icon>
                        <el-icon v-else-if="status.status === 'success'"><CircleCheck /></el-icon>
                        <el-icon v-else><CircleClose /></el-icon>
                        <span>{{ status.content }}</span>
                      </div>
                    </div>
                  </template>
                </div>

                <div class="message-time">
                  {{ formatMessageTime() }}
                </div>
              </div>
            </div>
          </div>

          <!-- 加载指示器 -->
          <div v-if="isLoading && !isStreaming" class="loading-indicator">
            <el-icon class="is-loading"><Loading /></el-icon>
            <span>AI正在思考中...</span>
          </div>
        </div>
      </div>

      <!-- 输入区域 -->
      <div class="input-container">
        <!-- 错误提示 -->
        <div v-if="error" class="error-message">
          <el-alert :title="error" type="error" :closable="true" @close="error = null" show-icon />
        </div>

        <!-- 语音输入组件 -->
        <div class="voice-input-wrapper">
          <VoiceInput
            @transcription="handleVoiceTranscription"
            @interim-transcription="handleInterimTranscription"
            @recording-started="handleRecordingStarted"
            @recording-stopped="handleRecordingStopped"
            @send-input="handleSendMessage"
          />
        </div>

        <!-- 输入框和操作按钮 -->
        <div class="input-area">
          <div class="input-with-voice">
            <el-input
              v-model="inputMessage"
              type="textarea"
              :rows="3"
              placeholder="请输入您的问题..."
              :maxlength="2000"
              show-word-limit
              @keydown.enter.exact.prevent="handleSendMessage"
              ref="inputRef"
              resize="none"
            />
          </div>

          <div class="input-actions">
            <el-button
              type="primary"
              :loading="isLoading"
              @click="handleSendMessage"
              :disabled="!inputMessage.trim() || !currentConversationId"
            >
              <el-icon><Promotion /></el-icon>
              发送
            </el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useChatStore } from '../stores/chat'
import { useUserStore } from '../stores/user'
import VoiceInput from '../components/VoiceInput.vue'
import {
  ChatDotRound,
  Promotion,
  Loading,
  More,
  Plus,
  Close,
  CircleCheck,
  CircleClose
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const chatStore = useChatStore()
const userStore = useUserStore()

const inputMessage = ref('')
const inputRef = ref<HTMLTextAreaElement>()
const messagesContainer = ref<HTMLDivElement>()

// 对话列表相关状态
  const currentConversationId = ref<string>('')
  const showConversationList = ref(false)

  // 移动端检测
  const isMobile = ref(false)

  // 监听窗口大小变化
  const handleResize = () => {
    isMobile.value = window.innerWidth <= 768
  }

  // 加载对话列表
  const loadConversations = async () => {
    try {
      await chatStore.getConversations()

      // 如果有对话列表且没有当前选中的对话，自动选中第一个对话
      if (chatStore.conversations.length > 0 && !currentConversationId.value && chatStore.conversations[0]) {
        await handleSelectConversation(chatStore.conversations[0].id)
      }
    } catch (error) {
      console.error('加载对话列表失败:', error)
    }
  }

  // 获取预览文本
  const getPreviewText = (conversation: { latest_message_preview?: string; title: string }): string => {
    // 优先使用最新消息预览，如果没有则使用对话标题
    if (conversation.latest_message_preview) {
      return conversation.latest_message_preview
    }
    // 如果没有最新消息预览，使用对话标题作为预览文本
    const preview = conversation.title.slice(0, 20)
    return conversation.title.length > 20 ? preview + '...' : preview
  }

  // 格式化时间
  const formatTime = (timestamp: string): string => {
    const now = new Date()
    let date
    if(timestamp){
      date = new Date(timestamp)
    }
    else{
      // 如果没有时间戳，默认使用当前时间
      date = now
    }
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    } else if (days === 1) {
      return '昨天'
    } else if (days < 7) {
      return `${days}天前`
    } else {
      return date.toLocaleDateString('zh-CN')
    }
  }

  // 计算属性
  const messages = computed(() => chatStore.messages)
  const isLoading = computed(() => chatStore.isLoading)
  const isStreaming = computed(() => chatStore.isStreaming)
  const error = computed(() => chatStore.error)
  const conversations = computed(() => chatStore.conversations)

  // 合并消息：将连续的assistant和tool消息合并到同一个气泡中
  const mergedMessages = computed(() => {
    const result: Array<{
      role: 'user' | 'assistant'
      messages: typeof messages.value
    }> = []

    for (let i = 0; i < messages.value.length; i++) {
      const currentMessage = messages.value[i]

      if (currentMessage.role === 'user') {
        result.push({
          role: 'user',
          messages: [currentMessage]
        })
      } else {
        // assistant或tool消息
        const lastGroup = result[result.length - 1]

        if (lastGroup && lastGroup.role === 'assistant') {
          // 检查是否应该合并：当前消息是assistant或tool，且与上一条消息属于同一组
          lastGroup.messages.push(currentMessage)
        } else {
          // 创建新的assistant组
          result.push({
            role: 'assistant',
            messages: [currentMessage]
          })
        }
      }
    }

    return result
  })

  // 判断是否应该显示头像（用于消息气泡合并）
  const shouldShowAvatar = (index: number, role: 'user' | 'assistant') => {
    if (index === 0) return true
    const prevGroup = mergedMessages.value[index - 1]
    if (!prevGroup) return true
    return prevGroup.role !== role
  }

  // 获取指定消息的工具调用状态
  const getMessageToolCallStatus = (messageId: string) => {
    return chatStore.getToolCallStatus(messageId)
  }

  // 判断是否应该显示工具调用状态消息（只有当有工具正在调用时才显示）
  const shouldShowToolCallStatus = (messageId: string) => {
    const statusMap = chatStore.getToolCallStatus(messageId)
    return Object.values(statusMap).some(status => status.status === 'calling')
  }

  // 格式化消息时间
  const formatMessageTime = () => {
    const now = new Date()
    return now.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

// 创建新对话
const handleCreateConversation = async () => {
  try {
    const newConversation = await chatStore.createConversation('新对话')
    // 不需要手动添加到conversations.value，因为chatStore.createConversation已经处理了
    await handleSelectConversation(newConversation.id)

    if (isMobile.value) {
      showConversationList.value = false
    }

    ElMessage.success('对话创建成功')
  } catch {
    ElMessage.error('创建对话失败')
  }
}

// 选择对话
const handleSelectConversation = async (conversationId: string) => {
  try {
    const conversation = await chatStore.getConversation(conversationId)
    currentConversationId.value = conversationId
    chatStore.setCurrentConversation(conversation)

    if (isMobile.value) {
      showConversationList.value = false
    }

    inputRef.value?.focus()
  } catch {
    ElMessage.error('加载对话失败')
  }
}

// 删除对话
const handleDeleteConversation = async (conversationId: string) => {
  try {
    await ElMessageBox.confirm('确定要删除这个对话吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })

    await chatStore.deleteConversation(conversationId)

    if (currentConversationId.value === conversationId) {
      currentConversationId.value = ''
      chatStore.clearMessages()
    }

    ElMessage.success('对话删除成功')
  } catch (error) {
    // 用户点击取消时不显示错误
    if (error !== 'cancel') {
      ElMessage.error('删除对话失败')
    }
  }
}

// 语音转录处理
const handleVoiceTranscription = (text: string) => {
  inputMessage.value = text
  // 只填充文本到输入框，不自动发送，让用户手动确认
}

// 实时转录处理
const handleInterimTranscription = (text: string) => {
  // 可以在这里显示实时转录结果，例如在输入框上方显示
  console.log('实时转录:', text)
}

// 录音开始处理
const handleRecordingStarted = () => {
  // 可以在这里显示录音状态
  console.log('录音开始')
}

// 录音结束处理
const handleRecordingStopped = () => {
  // 可以在这里隐藏录音状态
  console.log('录音结束')
}

// 发送消息
const handleSendMessage = async () => {
  if (!inputMessage.value.trim() || isLoading.value) return

  const message = inputMessage.value.trim()
  inputMessage.value = ''

  await chatStore.sendMessage(message)

  // 滚动到底部
  await nextTick()
  scrollToBottom()
}

// 滚动到底部
const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

// 监听消息变化，自动滚动
watch(
  messages,
  () => {
    nextTick(() => {
      scrollToBottom()
    })
  },
  { deep: true },
)

// 监听流式内容变化，自动滚动
watch(isStreaming, (newVal) => {
  if (newVal) {
    const scrollInterval = setInterval(() => {
      scrollToBottom()
      if (!isStreaming.value) {
        clearInterval(scrollInterval)
      }
    }, 100)
  }
})

// 初始化
onMounted(() => {
  inputRef.value?.focus()
  window.addEventListener('resize', handleResize)

  // 加载对话列表
  loadConversations()
})

// 组件卸载时清理
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.chat-container {
  height: 100vh;
  display: flex;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
}

/* 移动端菜单按钮 */
.mobile-menu-button {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1002;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
}

.mobile-menu-button .el-icon {
  font-size: 20px;
  color: #2c3e50;
}

/* 对话列表侧边栏 */
.conversation-sidebar {
  width: 300px;
  background: rgba(248, 249, 250, 0.98);
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  z-index: 1001;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sidebar-header h2 {
  margin: 0;
  color: #2c3e50;
  font-size: 18px;
  font-weight: 600;
}

.conversation-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px 0;
}

.conversation-item {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  cursor: pointer;
  border-bottom: 1px solid #f5f5f5;
  transition: background-color 0.2s;
}

.conversation-item:hover {
  background-color: #f8f9fa;
}

.conversation-item.active {
  background-color: #e3f2fd;
  border-left: 3px solid #007bff;
}

.conversation-content {
  flex: 1;
  min-width: 0;
}

.conversation-title {
  font-weight: 600;
  color: #2c3e50;
  font-size: 14px;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.conversation-preview {
  color: #7f8c8d;
  font-size: 12px;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.conversation-time {
  color: #bdc3c7;
  font-size: 11px;
}

.conversation-actions {
  opacity: 0;
  transition: opacity 0.2s;
  padding: 4px;
}

.conversation-item:hover .conversation-actions {
  opacity: 1;
}

.delete-icon {
  color: #e74c3c;
  font-size: 14px;
  cursor: pointer;
}

.delete-icon:hover {
  color: #c0392b;
}

.empty-conversations {
  padding: 40px 20px;
  text-align: center;
  color: #7f8c8d;
}

/* 遮罩层 */
.sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
}

/* 聊天主体区域 */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  max-width: calc(100% - 300px);
  width: 100%;
}

.chat-header {
  background: rgba(255, 255, 255, 0.95);
  padding: 20px;
  text-align: center;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.chat-header h1 {
  margin: 0 0 8px 0;
  color: #2c3e50;
  font-size: 28px;
  font-weight: 600;
}

.chat-header p {
  margin: 0;
  color: #7f8c8d;
  font-size: 14px;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: rgba(255, 255, 255, 0.9);
  margin-bottom: 20px;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.message-item {
  display: flex;
}

.message-item.user {
  justify-content: flex-end;
}

.message-item.assistant {
  justify-content: flex-start;
}

.message {
  display: flex;
  max-width: 70%;
  gap: 12px;
}

.user-message {
  flex-direction: row-reverse;
}

.assistant-message {
  flex-direction: row;
}

.message-avatar {
  flex-shrink: 0;
}

.message-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.user-message .message-content {
  align-items: flex-end;
}

.assistant-message .message-content {
  align-items: flex-start;
}

.message-bubble {
  padding: 12px 16px;
  border-radius: 18px;
  font-size: 14px;
  line-height: 1.5;
  word-wrap: break-word;
  white-space: pre-wrap;
}

.user-message .message-bubble {
  background: #007bff;
  color: white;
  border-bottom-right-radius: 4px;
}

.assistant-message .message-bubble {
  background: #f1f3f4;
  color: #333;
  border-bottom-left-radius: 4px;
}

.message-time {
  font-size: 12px;
  color: #999;
}

.ai-avatar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

/* 消息内容块样式 */
.message-text-block {
  margin-bottom: 8px;
}

.message-text-block:last-child {
  margin-bottom: 0;
}

/* 工具调用状态样式 */
.tool-call-status {
  margin-top: 8px;
  margin-bottom: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tool-call-status:last-child {
  margin-bottom: 0;
}

.tool-result-block {
  margin-bottom: 8px;
}

.tool-result-block:last-child {
  margin-bottom: 0;
}

.tool-call-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
  background: #f8f9fa;
  border-left: 3px solid;
}

.tool-call-item.calling {
  background: #e3f2fd;
  border-left-color: #2196f3;
  color: #1976d2;
}

.tool-call-item.success {
  background: #e8f5e9;
  border-left-color: #4caf50;
  color: #2e7d32;
}

.tool-call-item.failed {
  background: #ffebee;
  border-left-color: #f44336;
  color: #c62828;
}

.tool-call-item .el-icon {
  font-size: 14px;
}

.loading-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px;
  color: #666;
  font-size: 14px;
}

.streaming-content {
  display: inline;
}

.typing-indicator {
  display: inline-block;
  width: 4px;
  height: 14px;
  background: #666;
  margin-left: 2px;
  animation: blink 1s infinite;
}

@keyframes blink {
  0%,
  50% {
    opacity: 1;
  }
  51%,
  100% {
    opacity: 0;
  }
}

.input-container {
  background: rgba(255, 255, 255, 0.95);
  padding: 20px;
  border-top: 1px solid #e0e0e0;
}

.error-message {
  margin-bottom: 16px;
}

.voice-input-wrapper {
  margin-bottom: 12px;
  display: flex;
  justify-content: center;
}

.input-area {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.input-with-voice {
  flex: 1;
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.input-with-voice .el-textarea {
  flex: 1;
}

.input-actions {
  flex-shrink: 0;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .voice-input-wrapper {
    margin-bottom: 0;
  }

  .input-with-voice {
    flex-direction: column;
    gap: 8px;
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .chat-container {
    flex-direction: column;
  }

  .conversation-sidebar {
    position: fixed;
    top: 0;
    left: -300px;
    height: 100vh;
    width: 280px;
    transition: left 0.3s ease;
    z-index: 1001;
  }

  .conversation-sidebar.mobile-visible {
    left: 0;
  }

  .chat-main {
    max-width: 100%;
    padding: 0;
  }

  .messages-container {
    padding: 15px;
  }

  .message {
    max-width: 85%;
  }

  .input-actions {
    flex-direction: column;
  }

  .input-actions .el-button {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .chat-header h1 {
    font-size: 24px;
  }

  .message {
    max-width: 90%;
  }

  .message-bubble {
    padding: 10px 14px;
    font-size: 13px;
  }

  .conversation-sidebar {
    width: 100%;
    left: -100%;
  }

  .conversation-sidebar.mobile-visible {
    left: 0;
  }
}
</style>
