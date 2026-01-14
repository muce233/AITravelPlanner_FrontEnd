<template>
  <div class="voice-input-container">
    <!-- PC端模式 -->
    <div v-if="!isMobile" class="pc-mode" :class="{ 'horizontal': horizontal }">
      <el-tooltip :content="isRecording ? '停止录音' : '开始录音'" placement="top">
        <el-button
          :type="isRecording ? 'danger' : 'primary'"
          circle
          :size="horizontal ? 'default' : 'large'"
          @click="toggleRecording"
          :loading="isConnecting"
          :disabled="!hasMicrophonePermission"
        >
          <el-icon v-if="isRecording"><i-ep-turn-off-microphone /></el-icon>
          <el-icon v-else><Microphone /></el-icon>
        </el-button>
      </el-tooltip>

      <!-- 录音状态显示 -->
      <div v-if="isRecording && !horizontal" class="recording-status">
        <div class="recording-indicator">
          <span class="pulse"></span>
          <span class="text">录音中...</span>
        </div>
        <div class="recording-time">
          {{ formatTime(recordingTime) }}
        </div>
        <div v-if="showCountdown" class="countdown-warning">
          还剩 {{ countdown }} 秒
        </div>
      </div>
    </div>

    <!-- 移动端模式 -->
    <div v-else class="mobile-mode">
      <!-- 语音模式入口 -->
      <div v-if="!voiceMode" class="voice-entry">
        <el-tooltip content="语音输入" placement="top">
          <el-button
            type="primary"
            :icon="Microphone"
            circle
            size="large"
            @click="enterVoiceMode"
            :disabled="!hasMicrophonePermission"
          >
          </el-button>
        </el-tooltip>
      </div>

      <!-- 语音模式界面 -->
      <div v-else class="voice-interface">
        <div class="voice-header">
          <el-button
            type="text"
            @click="exitVoiceMode"
            class="exit-button"
          >
            <el-icon><i-ep-key /></el-icon>
            键盘
          </el-button>
        </div>

        <div class="voice-main">
          <div class="hold-to-talk"
               @touchstart="startRecording"
               @touchend="stopRecording"
               @touchcancel="stopRecording"
               :class="{ 'recording': isRecording }">
            <div class="hold-icon">
              <el-icon :size="32">
                <Microphone v-if="!isRecording" />
                <i-ep-turn-off-microphone v-else />
              </el-icon>
            </div>
            <div class="hold-text">
              {{ isRecording ? '松开结束' : '按住说话' }}
            </div>
          </div>

          <!-- 录音状态显示 -->
          <div v-if="isRecording" class="mobile-recording-status">
            <div class="time-display">
              {{ formatTime(recordingTime) }}
            </div>
            <div v-if="showCountdown" class="countdown-warning">
              还剩 {{ countdown }} 秒
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 权限提示 -->
    <div v-if="!hasMicrophonePermission && !permissionRequested" class="permission-prompt">
      <el-alert
        title="需要麦克风权限"
        description="请允许使用麦克风以启用语音输入功能"
        type="warning"
        :closable="false"
        show-icon
      />
      <el-button type="primary" size="small" @click="requestPermission">
        授权麦克风
      </el-button>
    </div>

    <!-- 错误提示 -->
    <div v-if="error" class="error-message">
      <el-alert
        :title="error"
        type="error"
        :closable="true"
        @close="error = null"
        show-icon
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Microphone } from '@element-plus/icons-vue'
import { speechService, type RealtimeTranscriptionResponse } from '@/services/speechService'

// 响应式数据
const isMobile = ref(false)
const isRecording = ref(false)
const isConnecting = ref(false)
const voiceMode = ref(false)
const hasMicrophonePermission = ref(false)
const permissionRequested = ref(false)
const error = ref<string | null>(null)

// 录音计时相关
const recordingTime = ref(0)
const countdown = ref(0)
const timer = ref<number | null>(null)

// 音频录制相关
const mediaRecorder = ref<MediaRecorder | null>(null)
const audioContext = ref<AudioContext | null>(null)
const audioStream = ref<MediaStream | null>(null)
const scriptProcessor = ref<ScriptProcessorNode | null>(null)
const sourceNode = ref<MediaStreamAudioSourceNode | null>(null)

// 配置
const config = ref({
  maxDuration: 60,
  unlimited: false,
  countdownWarning: 10,
  sampleRate: 16000,
  channels: 1,
  bitDepth: 16
})

// 计算属性
const showCountdown = computed(() => {
  return !config.value.unlimited &&
         recordingTime.value >= config.value.maxDuration - config.value.countdownWarning &&
         recordingTime.value < config.value.maxDuration
})

// 检测设备类型
const checkDeviceType = () => {
  isMobile.value = window.innerWidth <= 768
}

// 请求麦克风权限
const requestPermission = async () => {
  try {
    permissionRequested.value = true
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    hasMicrophonePermission.value = true
    // 立即关闭流，我们只需要权限
    stream.getTracks().forEach(track => track.stop())
    ElMessage.success('麦克风权限已授权')
  } catch {
    error.value = '麦克风权限被拒绝，请检查浏览器设置'
    hasMicrophonePermission.value = false
  }
}

// 检查麦克风权限
const checkMicrophonePermission = async () => {
  try {
    const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName })
    hasMicrophonePermission.value = permissionStatus.state === 'granted'

    permissionStatus.onchange = () => {
      hasMicrophonePermission.value = permissionStatus.state === 'granted'
    }
  } catch {
    // 浏览器不支持Permissions API，尝试直接请求
    await requestPermission()
  }
}

// 使用默认配置
const useDefaultConfig = () => {
  config.value.maxDuration = 60 // 默认最大时长60秒
  config.value.sampleRate = 16000 // 默认采样率16kHz
}

// 处理转录结果
const handleTranscription = (response: RealtimeTranscriptionResponse) => {
  if (response.text) {
    // 发送识别结果
    emit('transcription', response.text)
  }
}

// 处理识别错误
const handleRecognitionError = (errorMsg: string) => {
  error.value = errorMsg
  console.error('语音识别错误:', errorMsg)
}

// 初始化音频录制
const initAudioRecording = async (): Promise<boolean> => {
  try {
    // 获取麦克风流
    audioStream.value = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: config.value.sampleRate,
        channelCount: config.value.channels,
        echoCancellation: true,
        noiseSuppression: true
      }
    })

    // 创建音频上下文
    audioContext.value = new AudioContext({
      sampleRate: config.value.sampleRate
    })

    // 创建源节点
    sourceNode.value = audioContext.value.createMediaStreamSource(audioStream.value)

    // 创建脚本处理器节点（实时处理音频）
    const bufferSize = 4096
    scriptProcessor.value = audioContext.value.createScriptProcessor(bufferSize, 1, 1)

    // 连接节点
    sourceNode.value.connect(scriptProcessor.value)
    scriptProcessor.value.connect(audioContext.value.destination)

    // 设置音频处理回调
    scriptProcessor.value.onaudioprocess = (event) => {
      if (isRecording.value) {
        const inputData = event.inputBuffer.getChannelData(0)
        const pcmData = float32ToPCM16(inputData)
        const success = speechService.sendAudioData(pcmData)
        if (!success) {
          console.error('发送音频数据失败')
        }
      }
    }

    return true
  } catch (err) {
    console.error('初始化音频录制失败:', err)
    error.value = '初始化音频录制失败'
    return false
  }
}

// Float32转换为PCM16
const float32ToPCM16 = (float32Array: Float32Array): ArrayBuffer => {
  const pcm16Array = new Int16Array(float32Array.length)

  for (let i = 0; i < float32Array.length; i++) {
    const sampleValue = float32Array[i] || 0
    const sample = Math.max(-1, Math.min(1, sampleValue))
    pcm16Array[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF
  }

  return pcm16Array.buffer
}

// 开始录音
const startRecording = async () => {
  if (isRecording.value) return

  try {
    // 生成会话ID
    const sessionId = Date.now().toString()

    // 连接实时语音识别
    isConnecting.value = true
    const connected = speechService.connectRealtime(
      sessionId,
      handleTranscription,
      handleRecognitionError,
      () => {
        // WebSocket连接关闭回调
        console.log('语音识别连接已关闭')
      }
    )

    if (!connected) {
      error.value = '连接语音识别服务失败'
      isConnecting.value = false
      return
    }

    // 等待WebSocket连接建立
    const connectionEstablished = await speechService.waitForConnection(5000)
    if (!connectionEstablished) {
      error.value = 'WebSocket连接超时，请检查网络连接'
      isConnecting.value = false
      return
    }

    // 初始化音频录制
    const audioInitialized = await initAudioRecording()
    if (!audioInitialized) {
      error.value = '初始化音频录制失败'
      isConnecting.value = false
      return
    }

    // 开始录音
    isRecording.value = true
    recordingTime.value = 0

    // 启动计时器
    timer.value = setInterval(() => {
      recordingTime.value++

      if (showCountdown.value) {
        countdown.value = config.value.maxDuration - recordingTime.value
      }

      // 检查时间限制
      if (!config.value.unlimited && recordingTime.value >= config.value.maxDuration) {
        stopRecording()
      }
    }, 1000)

    emit('recording-started')
  } catch (err) {
    error.value = '启动录音失败'
    console.error('启动录音失败:', err)
  } finally {
    isConnecting.value = false
  }
}

// 停止录音
const stopRecording = () => {
  if (!isRecording.value) return

  isRecording.value = false

  // 停止计时器
  if (timer.value) {
    clearInterval(timer.value)
    timer.value = null
  }

  // 断开连接
  speechService.disconnectRealtime()

  // 清理音频资源
  cleanupAudioResources()

  emit('recording-stopped')
  // 触发发送输入事件
  emit('send-input')
}

// 清理音频录制资源
const cleanupAudioResources = () => {
  // 断开脚本处理器连接
  if (scriptProcessor.value) {
    scriptProcessor.value.disconnect()
    scriptProcessor.value = null
  }

  // 断开源节点连接
  if (sourceNode.value) {
    sourceNode.value.disconnect()
    sourceNode.value = null
  }

  // 关闭音频上下文
  if (audioContext.value) {
    audioContext.value.close()
    audioContext.value = null
  }

  // 停止音频流
  if (audioStream.value) {
    audioStream.value.getTracks().forEach(track => track.stop())
    audioStream.value = null
  }

  mediaRecorder.value = null
}

// 切换录音状态（PC端）
const toggleRecording = () => {
  if (isRecording.value) {
    stopRecording()
  } else {
    startRecording()
  }
}

// 进入语音模式（移动端）
const enterVoiceMode = () => {
  voiceMode.value = true
}

// 退出语音模式（移动端）
const exitVoiceMode = () => {
  voiceMode.value = false
  if (isRecording.value) {
    stopRecording()
  }
}

// 格式化时间显示
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// 事件发射器
const emit = defineEmits<{
  'recording-started': []
  'recording-stopped': []
  'transcription': [text: string]
  'interim-transcription': [text: string]
  'send-input': []
}>()

// Props
interface Props {
  horizontal?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  horizontal: false
})

// 生命周期
onMounted(() => {
  checkDeviceType()
  checkMicrophonePermission()
  useDefaultConfig()

  window.addEventListener('resize', checkDeviceType)
})

onUnmounted(() => {
  if (timer.value) {
    clearInterval(timer.value)
  }
  speechService.disconnectRealtime()
  window.removeEventListener('resize', checkDeviceType)
})
</script>

<style scoped>
.voice-input-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 8px;
}

/* PC端样式 */
.pc-mode {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.pc-mode.horizontal {
  flex-direction: row;
  gap: 8px;
}

.recording-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.pc-mode.horizontal .recording-status {
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.recording-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #f56c6c;
  font-size: 14px;
}

.pulse {
  width: 8px;
  height: 8px;
  background-color: #f56c6c;
  border-radius: 50%;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}

.recording-time {
  font-size: 16px;
  font-weight: bold;
  color: #409eff;
}

.countdown-warning {
  color: #e6a23c;
  font-size: 12px;
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0.5; }
}

/* 移动端样式 */
.mobile-mode {
  width: 100%;
}

.voice-interface {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.voice-header {
  display: flex;
  justify-content: flex-start;
}

.exit-button {
  color: #606266;
}

.voice-main {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.hold-to-talk {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background-color: #f5f7fa;
  border: 2px solid #dcdfe6;
  cursor: pointer;
  transition: all 0.3s;
  user-select: none;
}

.hold-to-talk.recording {
  background-color: #fef0f0;
  border-color: #f56c6c;
  color: #f56c6c;
}

.hold-icon {
  margin-bottom: 8px;
}

.hold-text {
  font-size: 14px;
  font-weight: 500;
}

.mobile-recording-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.time-display {
  font-size: 18px;
  font-weight: bold;
  color: #409eff;
}

/* 权限提示 */
.permission-prompt {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  max-width: 300px;
}

/* 错误提示 */
.error-message {
  max-width: 300px;
}
</style>
