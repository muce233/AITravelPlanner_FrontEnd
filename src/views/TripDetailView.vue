<template>
  <div class="trip-detail-container">
    <div class="trip-detail-layout">
      <!-- 左侧行程详情区域 -->
      <div class="trip-detail-left">
        <el-card class="trip-info-card">
          <div class="trip-info-header">
            <h2>{{ currentTrip?.title }}</h2>
            <div class="trip-actions">
              <el-button @click="goBack" size="small">
                <el-icon><ArrowLeft /></el-icon>
                返回首页
              </el-button>
              <el-button @click="editTrip" size="small">
                <el-icon><Edit /></el-icon>
                编辑行程
              </el-button>
            </div>
          </div>

          <div class="trip-info-content">
            <div class="trip-basic-info">
              <div class="info-item">
                <el-icon><Location /></el-icon>
                <span>{{ currentTrip?.destination || '未设置目的地' }}</span>
              </div>
              <div class="info-item">
                <el-icon><Calendar /></el-icon>
                <span>{{ formatDateRange(currentTrip?.start_date, currentTrip?.end_date) }}</span>
              </div>
            </div>
          </div>
        </el-card>

        <el-card class="trip-view-card">
          <div v-if="days.length === 0" class="empty-state">
            <el-empty description="暂无行程详情" />
          </div>
          <div v-else class="days-container">
            <div v-for="day in days" :key="day" class="day-block day-bg">
              <div class="day-header">
                <h3>第 {{ day }} 天</h3>
              </div>
              <div class="day-details">
                <div
                  v-for="detail in getDetailsByDay(day)"
                  :key="detail.id"
                  class="detail-item"
                  @click="editDetail(detail)"
                >
                  <div class="detail-type-icon" :class="detail.type">
                    <el-icon v-if="detail.type === '景点'"><Place /></el-icon>
                    <el-icon v-else-if="detail.type === '住宿'"><House /></el-icon>
                    <el-icon v-else-if="detail.type === '餐厅'"><Food /></el-icon>
                    <el-icon v-else-if="detail.type === '交通'"><Guide /></el-icon>
                  </div>
                  <div class="detail-main">
                    <div class="detail-title-row">
                      <span class="detail-time">{{ formatTime(detail.start_time) }}</span>
                      <span class="detail-name">{{ detail.name }}</span>
                    </div>
                    <div class="detail-info-row">
                      <span v-if="detail.address" class="detail-info-item">
                        <el-icon><Location /></el-icon>
                        {{ detail.address }}
                      </span>
                      <span v-if="detail.price > 0" class="detail-info-item">
                        <el-icon><Money /></el-icon>
                        {{ detail.price }}元
                      </span>
                    </div>
                    <p v-if="detail.description" class="detail-desc">{{ detail.description }}</p>
                    <div class="detail-actions">
                      <el-button size="small" type="danger" @click="handleDeleteDetail($event, detail)" class="delete-btn">
                        <el-icon><Close /></el-icon>
                      </el-button>
                    </div>
                  </div>
                </div>
                <div v-if="getDetailsByDay(day).length === 0" class="day-empty">
                  暂无行程点
                </div>
              </div>
            </div>
          </div>
          <div class="add-detail-section">
            <el-button type="primary" @click="addDetail(1)">
              <el-icon><Plus /></el-icon>
              添加行程点
            </el-button>
          </div>
        </el-card>
      </div>

      <!-- 右侧对话区域 -->
      <div class="trip-detail-right">
        <el-card class="chat-card">
          <div class="messages-container" ref="messagesContainer">
            <div v-if="messages.length === 0" class="empty-state">
              <el-empty description="开始与AI助手对话吧！" />
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

                <!-- AI助手消息 -->
                <div v-else class="message assistant-message">
                  <div v-if="shouldShowAvatar(groupIndex, 'assistant')" class="message-avatar">
                    <el-avatar :size="32" class="ai-avatar">
                      <el-icon><ChatDotRound /></el-icon>
                    </el-avatar>
                  </div>
                  <div class="message-content">
                    <div class="message-bubble">
                      <template v-for="(msg, msgIndex) in group.messages" :key="msg.id">
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

              <div v-if="isLoading && !isStreaming" class="loading-indicator">
                <el-icon class="is-loading"><Loading /></el-icon>
                <span>AI正在思考中...</span>
              </div>
            </div>
          </div>

          <div class="input-container">
            <div v-if="error" class="error-message">
              <el-alert :title="error" type="error" :closable="true" @close="error = null" show-icon />
            </div>

            <div class="input-area">
              <div class="input-with-voice">
                <el-input
                  v-model="inputMessage"
                  type="textarea"
                  :rows="2"
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
                  v-if="currentTrip?.conversation_id"
                  type="warning"
                  @click="handleClearConversation"
                >
                  <el-icon><Delete /></el-icon>
                  清空
                </el-button>
                <div class="input-actions-right">
                  <div class="voice-input-inline">
                    <VoiceInput
                      horizontal
                      @transcription="handleVoiceTranscription"
                      @interim-transcription="handleInterimTranscription"
                      @recording-started="handleRecordingStarted"
                      @recording-stopped="handleRecordingStopped"
                      @send-input="handleSendMessage"
                    />
                  </div>
                  <el-button
                    type="primary"
                    :loading="isLoading"
                    @click="handleSendMessage"
                    :disabled="!inputMessage.trim()"
                  >
                    <el-icon><Promotion /></el-icon>
                    发送
                  </el-button>
                </div>
              </div>
            </div>
          </div>
        </el-card>
      </div>
    </div>

    <el-dialog v-model="editDialogVisible" title="编辑行程" width="600px">
      <el-form :model="editForm" :rules="editRules" ref="editFormRef" label-width="100px">
        <el-form-item label="行程标题" prop="title">
          <el-input v-model="editForm.title" placeholder="请输入行程标题" />
        </el-form-item>
        <el-form-item label="目的地" prop="destination">
          <el-input v-model="editForm.destination" placeholder="请输入目的地" />
        </el-form-item>
        <el-form-item label="开始日期" prop="start_date">
          <el-date-picker
            v-model="editForm.start_date"
            type="date"
            placeholder="选择开始日期"
            style="width: 100%"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item label="结束日期" prop="end_date">
          <el-date-picker
            v-model="editForm.end_date"
            type="date"
            placeholder="选择结束日期"
            style="width: 100%"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSaveEdit" :loading="saving">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="detailDialogVisible" :title="detailDialogTitle" width="700px">
      <el-form :model="detailForm" :rules="detailRules" ref="detailFormRef" label-width="100px">
        <el-form-item label="天数" prop="day">
          <el-input-number v-model.number="detailForm.day" :min="1" :max="30" :step="1" />
        </el-form-item>
        <el-form-item label="类型" prop="type">
          <el-select v-model="detailForm.type" placeholder="请选择类型" style="width: 100%">
            <el-option label="景点" value="景点" />
            <el-option label="住宿" value="住宿" />
            <el-option label="餐厅" value="餐厅" />
            <el-option label="交通" value="交通" />
          </el-select>
        </el-form-item>
        <el-form-item label="名称" prop="name">
          <el-input v-model="detailForm.name" placeholder="请输入名称" />
        </el-form-item>
        <el-form-item label="地址">
          <el-input v-model="detailForm.address" placeholder="请输入地址" />
        </el-form-item>
        <el-form-item label="开始时间">
          <el-date-picker
            v-model="detailForm.start_time"
            type="datetime"
            placeholder="选择开始时间"
            style="width: 100%"
            format="YYYY-MM-DD HH:mm"
            value-format="YYYY-MM-DDTHH:mm:ss"
          />
        </el-form-item>
        <el-form-item label="结束时间">
          <el-date-picker
            v-model="detailForm.end_time"
            type="datetime"
            placeholder="选择结束时间"
            style="width: 100%"
            format="YYYY-MM-DD HH:mm"
            value-format="YYYY-MM-DDTHH:mm:ss"
          />
        </el-form-item>
        <el-form-item label="价格">
          <el-input-number v-model.number="detailForm.price" :min="0" :precision="2" :step="0.01" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="detailForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入描述"
          />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="detailForm.notes"
            type="textarea"
            :rows="2"
            placeholder="请输入备注"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="detailDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSaveDetail" :loading="savingDetail">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTripStore } from '../stores/trip'
import { useUserStore } from '../stores/user'
import { useChatStore } from '../stores/chat'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import {
  Edit,
  Location,
  Calendar,
  Plus,
  Delete,
  Money,
  ChatDotRound,
  Promotion,
  Loading,
  CircleCheck,
  CircleClose,
  ArrowLeft,
  Place,
  House,
  Close,
  Food,
  Guide
} from '@element-plus/icons-vue'
import VoiceInput from '../components/VoiceInput.vue'

const route = useRoute()
const router = useRouter()
const tripStore = useTripStore()
const userStore = useUserStore()
const chatStore = useChatStore()

const tripId = computed(() => route.params.id as string)
const currentTrip = computed(() => tripStore.currentTrip)
const tripDetails = computed(() => tripStore.tripDetails)

const editDialogVisible = ref(false)
const editFormRef = ref<FormInstance>()
const saving = ref(false)
const editForm = ref({
  title: '',
  destination: '',
  start_date: '',
  end_date: '',
})

const detailDialogVisible = ref(false)
const detailFormRef = ref<FormInstance>()
const savingDetail = ref(false)
const detailDialogTitle = ref('')
const isEditingDetail = ref(false)
const currentDetailId = ref('')
const detailForm = ref({
  day: 1,
  type: '景点',
  name: '',
  address: '',
  start_time: '',
  end_time: '',
  description: '',
  price: 0,
  notes: '',
})

const inputMessage = ref('')
const inputRef = ref<HTMLTextAreaElement>()
const messagesContainer = ref<HTMLDivElement>()

const editRules = ref<FormRules>({
  end_date: [
    {
      validator: (rule, value, callback) => {
        if (
          value &&
          editForm.value.start_date &&
          new Date(value) < new Date(editForm.value.start_date)
        ) {
          callback(new Error('结束日期不能早于开始日期'))
        } else {
          callback()
        }
      },
      trigger: 'change',
    },
  ],
})

const detailRules = ref<FormRules>({
  day: [{ required: true, message: '请输入天数', trigger: 'blur' }],
  type: [{ required: true, message: '请选择类型', trigger: 'change' }],
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
})

const days = computed(() => {
  const daySet = new Set(tripDetails.value.map((detail) => detail.day))
  return Array.from(daySet).sort((a, b) => a - b)
})

const formatDate = (dateString?: string) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString()
}

const formatTime = (timeString?: string | null) => {
  if (!timeString) return ''
  const date = new Date(timeString)
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

const formatDateRange = (startDate?: string | null, endDate?: string | null) => {
  if (!startDate || !endDate) return ''
  return `${formatDate(startDate)} - ${formatDate(endDate)}`
}

const getDetailsByDay = (day: number) => {
  return tripDetails.value
    .filter((detail) => detail.day === day)
    .sort((a, b) => {
      const timeA = new Date(a.start_time || 0).getTime()
      const timeB = new Date(b.start_time || 0).getTime()
      return timeA - timeB
    })
}

const goBack = () => {
  router.push('/')
}

const editTrip = () => {
  if (!currentTrip.value) return
  editForm.value = {
    title: currentTrip.value.title || '',
    destination: currentTrip.value.destination || '',
    start_date: currentTrip.value.start_date || '',
    end_date: currentTrip.value.end_date || '',
  }
  editDialogVisible.value = true
}

const handleSaveEdit = async () => {
  if (!editFormRef.value) return

  try {
    await editFormRef.value.validate()
    saving.value = true

    await tripStore.updateTrip(tripId.value, editForm.value)
    ElMessage.success('行程更新成功')
    editDialogVisible.value = false
  } catch (error: any) {
    ElMessage.error(error.response?.data?.detail || '行程更新失败')
  } finally {
    saving.value = false
  }
}

const addDetail = (day: number) => {
  isEditingDetail.value = false
  currentDetailId.value = ''
  detailDialogTitle.value = '添加行程点'
  detailForm.value = {
    day: day,
    type: '景点',
    name: '',
    address: '',
    start_time: '',
    end_time: '',
    description: '',
    price: 0,
    notes: '',
  }
  detailDialogVisible.value = true
}

const editDetail = (detail: any) => {
  isEditingDetail.value = true
  currentDetailId.value = detail.id
  detailDialogTitle.value = '编辑行程点'
  detailForm.value = {
    day: detail.day,
    type: detail.type,
    name: detail.name,
    address: detail.address || '',
    start_time: detail.start_time || '',
    end_time: detail.end_time || '',
    description: detail.description || '',
    price: detail.price || 0,
    notes: detail.notes || '',
  }
  detailDialogVisible.value = true
}

const handleSaveDetail = async () => {
  if (!detailFormRef.value) return

  try {
    await detailFormRef.value.validate()
    savingDetail.value = true

    const detailData = {
      ...detailForm.value,
      start_time: detailForm.value.start_time || null,
      end_time: detailForm.value.end_time || null,
      location: null,
      images: [],
    }

    if (isEditingDetail.value) {
      await tripStore.updateTripDetail(tripId.value, currentDetailId.value, detailData)
      ElMessage.success('行程点更新成功')
    } else {
      await tripStore.createTripDetail(tripId.value, detailData)
      ElMessage.success('行程点添加成功')
    }

    detailDialogVisible.value = false
  } catch (error: any) {
    if (error !== false) {
      ElMessage.error(error.response?.data?.detail || '操作失败')
    }
  } finally {
    savingDetail.value = false
  }
}

const handleDeleteDetail = (event: Event, detail: any) => {
  event.stopPropagation()
  deleteDetail(detail)
}

const deleteDetail = async (detail: any) => {
  try {
    await ElMessageBox.confirm('确定要删除这个行程点吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })

    await tripStore.deleteTripDetail(tripId.value, detail.id)
    ElMessage.success('行程点删除成功')
  } catch (error) {
  }
}

const messages = computed(() => chatStore.messages)
const isLoading = computed(() => chatStore.isLoading)
const isStreaming = computed(() => chatStore.isStreaming)
const error = computed(() => chatStore.error)

const mergedMessages = computed(() => {
  const result: Array<{
    role: 'user' | 'assistant'
    messages: typeof messages.value
  }> = []

  for (let i = 0; i < messages.value.length; i++) {
    const currentMessage = messages.value[i]

    if (!currentMessage) continue

    if (currentMessage.role === 'user') {
      result.push({
        role: 'user',
        messages: [currentMessage]
      })
    } else {
      const lastGroup = result[result.length - 1]

      if (lastGroup && lastGroup.role === 'assistant') {
        lastGroup.messages.push(currentMessage)
      } else {
        result.push({
          role: 'assistant',
          messages: [currentMessage]
        })
      }
    }
  }

  return result
})

const shouldShowAvatar = (index: number, role: 'user' | 'assistant') => {
  if (index === 0) return true
  const prevGroup = mergedMessages.value[index - 1]
  if (!prevGroup) return true
  return prevGroup.role !== role
}

const getMessageToolCallStatus = (messageId: string) => {
  return chatStore.getToolCallStatus(messageId)
}

const shouldShowToolCallStatus = (messageId: string) => {
  const statusMap = chatStore.getToolCallStatus(messageId)
  return Object.values(statusMap).some(status => status.status === 'calling')
}

const formatMessageTime = () => {
  const now = new Date()
  return now.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

const handleVoiceTranscription = (text: string) => {
  inputMessage.value = text
}

const handleInterimTranscription = (text: string) => {
  console.log('实时转录:', text)
}

const handleRecordingStarted = () => {
  console.log('录音开始')
}

const handleRecordingStopped = () => {
  console.log('录音结束')
}

const handleSendMessage = async () => {
  if (!inputMessage.value.trim() || isLoading.value) return

  const message = inputMessage.value.trim()
  inputMessage.value = ''

  await chatStore.sendMessage(message)

  await nextTick()
  scrollToBottom()
}

const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

const handleClearConversation = async () => {
  if (!currentTrip.value?.conversation_id) {
    ElMessage.warning('当前行程没有关联的对话')
    return
  }

  try {
    await ElMessageBox.confirm('确定要清空当前对话的所有消息吗？此操作不可恢复。', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })

    await chatStore.clearConversationMessages(currentTrip.value.conversation_id)

    const messages = await chatStore.getConversationMessages(currentTrip.value.conversation_id)
    chatStore.setMessages(messages)
  } catch (error) {
    // 用户点击取消时不显示错误
    if (error !== 'cancel') {
      ElMessage.error('清空对话失败')
    }
  }
}

watch(
  () => messages.value.length,
  async (newLength, oldLength) => {
    nextTick(() => {
      scrollToBottom()
    })

    if (oldLength !== undefined && newLength > oldLength) {
      const lastMessage = messages.value[messages.value.length - 1]

      if (!lastMessage) return

      if (lastMessage.message_type === 'tool_result') {
        const match = lastMessage.content.match(/工具 (\w+) 调用完成/)
        if (match) {
          const toolName = match[1]
          try {
            if (toolName === 'edit_trip') {
              await tripStore.fetchTripById(tripId.value)
            } else if (
              toolName === 'create_trip_detail' ||
              toolName === 'update_trip_detail' ||
              toolName === 'delete_trip_detail'
            ) {
              await tripStore.fetchTripDetails(tripId.value)
            }
          } catch (error) {
            console.error('刷新数据失败:', error)
          }
        }
      }
    }
  },
)

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

const fetchData = async () => {
  await userStore.initialize()
  if (!userStore.isAuthenticated) {
    router.push('/login')
    return
  }

  await tripStore.fetchTripById(tripId.value)
  await tripStore.fetchTripDetails(tripId.value)

  if (currentTrip.value?.conversation_id) {
    try {
      const messages = await chatStore.getConversationMessages(currentTrip.value.conversation_id)
      chatStore.setMessages(messages)
    } catch (error) {
      console.error('加载对话历史失败:', error)
    }
  }
}

watch(tripId, () => {
  fetchData()
})

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.trip-detail-container {
  max-width: 1800px;
  margin: 0 auto;
  padding: 20px;
  height: calc(100vh - 40px);
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.trip-detail-layout {
  display: flex;
  gap: 20px;
  flex: 1;
  overflow: hidden;
}

.trip-detail-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding-right: 10px;
  overflow: hidden;
}

.trip-detail-right {
  flex: 2;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.trip-info-card {
  margin-bottom: 20px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border: none;
  overflow: hidden;
  flex-shrink: 0;
}

.trip-info-card :deep(.el-card__body) {
  padding: 24px;
}

.trip-info-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 2px solid #f0f0f0;
}

.trip-info-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #2c3e50;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.trip-actions {
  display: flex;
  gap: 10px;
}

.trip-actions .el-button {
  border-radius: 8px;
  transition: all 0.3s ease;
}

.trip-actions .el-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.trip-info-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
}

.trip-basic-info {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #606266;
  font-size: 13px;
  padding: 4px 0;
}

.info-item .el-icon {
  color: #909399;
  font-size: 14px;
}

.trip-view-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border: none;
  overflow: hidden;
  min-height: 0;
}

.trip-view-card :deep(.el-card__body) {
  padding: 24px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex: 1;
  min-height: 0;
}

.days-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
  width: 100%;
  scrollbar-gutter: stable;
  padding-right: 8px;
  margin-right: 4px;
}

.days-container::-webkit-scrollbar {
  width: 6px;
}

.days-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.days-container::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.days-container::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

.day-block {
  margin-bottom: 20px;
  width: 100%;
  overflow: hidden;
}

.day-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-radius: 8px;
  color: #2c3e50;
}

.day-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.day-details {
  width: 100%;
  /* overflow: hidden; */
}

.day-bg {
  background: linear-gradient(135deg, #fafafa 0%, #f0f0f0 100%);
  border-radius: 12px;
  padding: 16px;
  box-sizing: border-box;
}

.detail-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: white;
  border-radius: 8px;
  margin-bottom: 10px;
  border: 1px solid #e8e8e8;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  width: 100%;
  box-sizing: border-box;
  cursor: pointer;
  transition: all 0.2s ease;
  overflow: hidden;
  position: relative;
}

.detail-item:hover {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.15);
  transform: translateY(-1px);
}

.detail-type-icon {
  flex-shrink: 0;
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  font-size: 24px;
}

.detail-type-icon .el-icon {
  font-size: 24px;
}

.detail-type-icon.景点 {
  color: #667eea;
}

.detail-type-icon.住宿 {
  color: #28a745;
}

.detail-type-icon.餐厅 {
  color: #ffc107;
}

.detail-type-icon.交通 {
  color: #17a2b8;
}

.detail-main {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.detail-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  overflow: hidden;
}

.detail-time {
  flex-shrink: 0;
  font-size: 14px;
  font-weight: 600;
  color: #667eea;
  min-width: 50px;
}

.detail-name {
  flex: 1;
  font-size: 15px;
  font-weight: 600;
  color: #2c3e50;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-info-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 8px;
  overflow: hidden;
}

.detail-info-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #5a6c7d;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.detail-info-item .el-icon {
  flex-shrink: 0;
  font-size: 14px;
}

.detail-desc {
  margin: 8px 0;
  font-size: 13px;
  color: #5a6c7d;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.detail-actions {
  position: absolute;
  top: 50%;
  right: 8px;
  transform: translateY(-50%);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.detail-item:hover .detail-actions {
  opacity: 1;
}

.delete-btn {
  padding: 0 !important;
  min-width: 20px !important;
  height: 20px !important;
  border-radius: 4px !important;
  background: rgba(245, 108, 108, 0.1) !important;
  border: none !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.delete-btn:hover {
  background: rgba(245, 108, 108, 0.2) !important;
}

.delete-btn .el-icon {
  font-size: 12px !important;
  color: #f56c6c !important;
}

.day-empty {
  text-align: center;
  padding: 20px;
  color: #999;
  font-size: 14px;
}

.add-detail-section {
  display: flex;
  justify-content: center;
  padding: 10px 0;
  margin-top: 5px;
  flex-shrink: 0;
  background: white;
  border-top: 1px solid #f0f0f0;
}

.empty-state {
  padding: 40px 0;
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  flex-grow: 1;
  min-height: 0;
}

.chat-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border: none;
  overflow: hidden;
}

.chat-card :deep(.el-card__body) {
  padding: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: linear-gradient(180deg, #f8f9fa 0%, #ffffff 100%);
  scrollbar-gutter: stable;
  padding-right: 16px;
  margin-right: 4px;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.messages-container::-webkit-scrollbar {
  width: 6px;
}

.messages-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.messages-container::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.messages-container::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
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
  max-width: 85%;
  gap: 8px;
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
  line-height: 1.6;
  word-wrap: break-word;
  white-space: pre-wrap;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.user-message .message-bubble {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-bottom-right-radius: 4px;
}

.assistant-message .message-bubble {
  background: #ffffff;
  color: #2c3e50;
  border-bottom-left-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid #e8e8e8;
}

.message-time {
  font-size: 11px;
  color: #999;
}

.ai-avatar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.message-text-block {
  margin-bottom: 4px;
}

.streaming-content {
  display: inline;
}

.typing-indicator {
  display: inline-block;
  width: 8px;
  height: 8px;
  background: currentColor;
  border-radius: 50%;
  animation: typing 1s infinite;
  margin-left: 4px;
}

@keyframes typing {
  0%, 100% {
    opacity: 0.3;
  }
  50% {
    opacity: 1;
  }
}

.tool-call-status,
.tool-result-block {
  margin: 4px 0;
  padding: 8px;
  background: #f0f0f0;
  border-radius: 8px;
  font-size: 12px;
}

.tool-call-item {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 4px 0;
}

.tool-call-item.calling {
  color: #007bff;
}

.tool-call-item.success {
  color: #28a745;
}

.tool-call-item.failed {
  color: #dc3545;
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

.input-container {
  border-top: 1px solid #e0e0e0;
  padding: 20px 24px;
  background: white;
}

.error-message {
  margin-bottom: 10px;
}

.voice-input-inline {
  display: flex;
  align-items: center;
}

.voice-input-inline :deep(.pc-mode) {
  flex-direction: row;
  gap: 8px;
}

.voice-input-inline :deep(.pc-mode .recording-status) {
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.voice-input-inline :deep(.recording-status) {
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.input-area {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.input-with-voice {
  flex: 1;
}

.input-with-voice :deep(.el-textarea__inner) {
  border-radius: 8px;
  border: 2px solid #e8e8e8;
  transition: all 0.3s ease;
  font-size: 14px;
  line-height: 1.6;
}

.input-with-voice :deep(.el-textarea__inner):focus {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.input-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.input-actions-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.input-actions .el-button {
  border-radius: 8px;
  padding: 10px 24px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.input-actions .el-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}
</style>
