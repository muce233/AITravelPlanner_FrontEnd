<template>
  <div class="trip-detail-container">
    <div class="trip-detail-layout">
      <!-- 左侧行程详情区域 -->
      <div class="trip-detail-left">
        <el-card class="trip-info-card">
          <div class="trip-info-header">
            <h2>{{ currentTrip?.title }}</h2>
            <div class="trip-actions">
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
          <div class="timeline-section">
            <div v-if="days.length === 0" class="empty-state">
              <el-empty description="暂无行程详情">
                <el-button type="primary" @click="addDetail(1)">
                  <el-icon><Plus /></el-icon>
                  添加第一个行程点
                </el-button>
              </el-empty>
            </div>
            <el-collapse v-else v-model="activeDays" accordion>
              <el-collapse-item v-for="day in days" :key="day" :title="`第 ${day} 天`">
                <el-timeline>
                  <el-timeline-item
                    v-for="detail in getDetailsByDay(day)"
                    :key="detail.id"
                    :timestamp="formatTime(detail.start_time)"
                    :type="getDetailTypeColor(detail.type)"
                  >
                    <el-card class="detail-card">
                      <div class="detail-header">
                        <h3>{{ detail.name }}</h3>
                        <el-tag :type="getDetailTypeColor(detail.type)">
                          {{ getDetailTypeName(detail.type) }}
                        </el-tag>
                      </div>

                      <div class="detail-content">
                        <p class="detail-time">
                          {{ formatTimeRange(detail.start_time, detail.end_time) }}
                        </p>
                        <p class="detail-address" v-if="detail.address">{{ detail.address }}</p>
                        <p class="detail-description" v-if="detail.description">
                          {{ detail.description }}
                        </p>
                        <p class="detail-price" v-if="detail.price > 0">
                          <el-icon><Money /></el-icon>
                          {{ detail.price }} 元
                        </p>
                      </div>

                      <div class="detail-actions">
                        <el-button size="small" @click="editDetail(detail)">
                          <el-icon><Edit /></el-icon>
                          编辑
                        </el-button>
                        <el-button size="small" type="danger" @click="deleteDetail(detail)">
                          <el-icon><Delete /></el-icon>
                          删除
                        </el-button>
                      </div>
                    </el-card>
                  </el-timeline-item>
                </el-timeline>

                <div class="add-detail-section">
                  <el-button type="primary" size="small" @click="addDetail(day)">
                    <el-icon><Plus /></el-icon>
                    添加行程点
                  </el-button>
                </div>
              </el-collapse-item>
            </el-collapse>
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
          <el-input-number v-model="detailForm.day" :min="1" :max="30" />
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
          <el-time-picker
            v-model="detailForm.start_time"
            placeholder="选择开始时间"
            style="width: 100%"
            format="HH:mm"
            value-format="HH:mm:ss"
          />
        </el-form-item>
        <el-form-item label="结束时间">
          <el-time-picker
            v-model="detailForm.end_time"
            placeholder="选择结束时间"
            style="width: 100%"
            format="HH:mm"
            value-format="HH:mm:ss"
          />
        </el-form-item>
        <el-form-item label="价格">
          <el-input-number v-model="detailForm.price" :min="0" :precision="2" />
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
  CircleClose
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

const activeDays = ref([1])
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

const formatTime = (timeString?: string) => {
  if (!timeString) return ''
  const date = new Date(timeString)
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

const formatDateRange = (startDate?: string, endDate?: string) => {
  if (!startDate || !endDate) return ''
  return `${formatDate(startDate)} - ${formatDate(endDate)}`
}

const formatTimeRange = (startTime?: string, endTime?: string) => {
  if (!startTime || !endTime) return ''
  return `${formatTime(startTime)} - ${formatTime(endTime)}`
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

const getDetailTypeColor = (type: string) => {
  const colorMap: Record<string, string> = {
    景点: 'primary',
    住宿: 'success',
    餐厅: 'warning',
    交通: 'info',
  }
  return colorMap[type] || 'default'
}

const getDetailTypeName = (type: string) => {
  return type
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
    start_time: detail.start_time ? detail.start_time.substring(11, 19) : '',
    end_time: detail.end_time ? detail.end_time.substring(11, 19) : '',
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
      start_time: detailForm.value.start_time
        ? `${currentTrip.value?.start_date}T${detailForm.value.start_time}`
        : null,
      end_time: detailForm.value.end_time
        ? `${currentTrip.value?.start_date}T${detailForm.value.end_time}`
        : null,
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

watch(
  messages,
  () => {
    nextTick(() => {
      scrollToBottom()
    })
  },
  { deep: true },
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
}

.timeline-section {
  padding: 10px 0;
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.timeline-section::-webkit-scrollbar {
  width: 6px;
}

.timeline-section::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.timeline-section::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.timeline-section::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

.detail-card {
  margin-bottom: 10px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: none;
  transition: all 0.3s ease;
}

.detail-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.detail-card :deep(.el-card__body) {
  padding: 16px;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid #f0f0f0;
}

.detail-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
}

.detail-content {
  margin-bottom: 15px;
}

.detail-time,
.detail-address,
.detail-description,
.detail-price {
  margin: 6px 0;
  font-size: 14px;
  color: #5a6c7d;
  line-height: 1.6;
}

.detail-price {
  color: #28a745;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
}

.detail-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding-top: 10px;
  border-top: 1px solid #f0f0f0;
}

.detail-actions .el-button {
  border-radius: 6px;
  transition: all 0.3s ease;
}

.detail-actions .el-button:hover {
  transform: translateY(-1px);
}

.add-detail-section {
  margin-top: 20px;
  text-align: right;
  padding: 15px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 8px;
}

.empty-state {
  padding: 40px 0;
  text-align: center;
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
  justify-content: flex-end;
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
