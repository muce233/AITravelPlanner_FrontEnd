<template>
  <div class="chat-container">
    <!-- 页面标题 -->
    <div class="chat-header">
      <h1>AI聊天助手</h1>
      <p>与智能助手进行实时对话，获取专业建议和帮助</p>
    </div>

    <!-- 聊天主体区域 -->
    <div class="chat-main">
      <!-- 消息列表 -->
      <div class="messages-container" ref="messagesContainer">
        <div v-if="messages.length === 0" class="empty-state">
          <el-empty description="开始对话吧！" />
        </div>

        <div v-else class="messages-list">
          <div
            v-for="(message, index) in messages"
            :key="index"
            :class="['message-item', message.role]"
          >
            <!-- 用户消息 -->
            <div v-if="message.role === 'user'" class="message user-message">
              <div class="message-avatar">
                <el-avatar :size="32" :src="userStore.user?.avatar" />
              </div>
              <div class="message-content">
                <div class="message-bubble">
                  {{ message.content }}
                </div>
                <div class="message-time">
                  {{ formatMessageTime(index) }}
                </div>
              </div>
            </div>

            <!-- AI助手消息 -->
            <div v-else class="message assistant-message">
              <div class="message-avatar">
                <el-avatar :size="32" class="ai-avatar">
                  <el-icon><ChatDotRound /></el-icon>
                </el-avatar>
              </div>
              <div class="message-content">
                <div class="message-bubble">
                  <div
                    v-if="isStreaming && index === messages.length - 1"
                    class="streaming-content"
                  >
                    {{ message.content }}
                    <span class="typing-indicator"></span>
                  </div>
                  <div v-else>
                    {{ message.content }}
                  </div>
                </div>
                <div class="message-time">
                  {{ formatMessageTime(index) }}
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

        <!-- 输入框和操作按钮 -->
        <div class="input-area">
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
          <div class="input-actions">
            <el-button
              type="primary"
              :loading="isLoading"
              @click="handleSendMessage"
              :disabled="!inputMessage.trim()"
            >
              <el-icon><Promotion /></el-icon>
              发送
            </el-button>
            <el-button @click="handleClearMessages" :disabled="messages.length === 0">
              <el-icon><Delete /></el-icon>
              清空对话
            </el-button>
            <el-button type="info" @click="handleTestConnection">
              <el-icon><Connection /></el-icon>
              测试连接
            </el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useChatStore } from '../stores/chat'
import { useUserStore } from '../stores/user'
import { ChatDotRound, Promotion, Delete, Connection, Loading } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const chatStore = useChatStore()
const userStore = useUserStore()

const inputMessage = ref('')
const inputRef = ref<HTMLTextAreaElement>()
const messagesContainer = ref<HTMLDivElement>()

// 计算属性
const messages = computed(() => chatStore.messages)
const isLoading = computed(() => chatStore.isLoading)
const isStreaming = computed(() => chatStore.isStreaming)
const error = computed(() => chatStore.error)

// 格式化消息时间
const formatMessageTime = (index: number) => {
  const now = new Date()
  return now.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

// 发送消息
const handleSendMessage = async () => {
  if (!inputMessage.value.trim() || isLoading.value) return

  const message = inputMessage.value.trim()
  inputMessage.value = ''

  await chatStore.sendMessage(message, true)

  // 滚动到底部
  await nextTick()
  scrollToBottom()
}

// 清空对话
const handleClearMessages = () => {
  chatStore.clearMessages()
  inputRef.value?.focus()
}

// 测试连接
const handleTestConnection = async () => {
  const isConnected = await chatStore.testConnection()
  if (isConnected) {
    ElMessage.success('连接测试成功！')
  } else {
    ElMessage.error('连接测试失败，请检查网络连接')
  }
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

  // 检查用户登录状态
  if (!userStore.isAuthenticated) {
    ElMessage.warning('请先登录后再使用聊天功能')
    setTimeout(() => {
      window.location.href = '/login'
    }, 2000)
  }
})
</script>

<style scoped>
.chat-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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

.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  padding: 20px;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  margin-bottom: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
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
  gap: 20px;
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
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.error-message {
  margin-bottom: 16px;
}

.input-area {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.input-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .chat-main {
    padding: 10px;
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
}
</style>
