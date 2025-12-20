<template>
  <div class="voice-input-container">
    <!-- PC端模式 -->
    <div v-if="!isMobile" class="pc-mode">
      <el-tooltip :content="isRecording ? '停止录音' : '开始录音'" placement="top">
        <el-button
          :type="isRecording ? 'danger' : 'primary'"
          circle
          size="large"
          @click="toggleRecording"
          :loading="isConnecting"
          :disabled="!hasMicrophonePermission"
        >
          <el-icon v-if="isRecording"><i-ep-turn-off-microphone /></el-icon>
          <el-icon v-else><Microphone /></el-icon>
        </el-button>
      </el-tooltip>

      <!-- 录音状态显示 -->
      <div v-if="isRecording" class="recording-status">
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
import { speechService, ASRModelType, type RealtimeTranscriptionResponse } from '@/services/speechService'

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

// 配置
const config = ref({
  maxDuration: 60,
  unlimited: false,
  countdownWarning: 10,
  vadEnabled: true,
  sampleRate: 16000,
  channels: 1,
  bitDepth: 16,
  modelType: ASRModelType.FUN_ASR_REALTIME
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

// 获取配置
const fetchConfig = async () => {
  try {
    const serviceConfig = await speechService.getConfig()
    config.value.maxDuration = serviceConfig.max_duration
    config.value.sampleRate = serviceConfig.sample_rate
    config.value.modelType = serviceConfig.default_model
  } catch (err) {
    console.error('获取语音配置失败:', err)
  }
}

// 处理转录结果
const handleTranscription = (response: RealtimeTranscriptionResponse) => {
  if (response.text && response.is_final) {
    // 发送最终识别结果
    emit('transcription', response.text)
  } else if (response.text) {
    // 实时转录结果
    emit('interim-transcription', response.text)
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

    // 创建MediaRecorder
    const options = {
      mimeType: 'audio/webm;codecs=opus',
      audioBitsPerSecond: 16000
    }

    mediaRecorder.value = new MediaRecorder(audioStream.value, options)

    // 设置数据可用时的处理
    mediaRecorder.value.ondataavailable = async (event) => {
      if (event.data.size > 0) {
        await processAudioData(event.data)
      }
    }

    return true
  } catch (err) {
    console.error('初始化音频录制失败:', err)
    error.value = '初始化音频录制失败'
    return false
  }
}

// 处理音频数据
const processAudioData = async (audioBlob: Blob) => {
  try {
    // 将Blob转换为ArrayBuffer
    const arrayBuffer = await audioBlob.arrayBuffer()

    // 解码音频数据
    const audioBuffer = await audioContext.value!.decodeAudioData(arrayBuffer)

    // 转换为PCM格式
    const pcmData = convertToPCM(audioBuffer)

    // 发送到语音识别服务
    const success = speechService.sendAudioData(pcmData)
    if (!success) {
      console.error('发送音频数据失败')
    }
  } catch (err) {
    console.error('处理音频数据失败:', err)
  }
}

// 转换为PCM格式
const convertToPCM = (audioBuffer: AudioBuffer): ArrayBuffer => {
  const length = audioBuffer.length
  const sampleRate = audioBuffer.sampleRate

  // 如果采样率不匹配，需要重采样
  if (sampleRate !== config.value.sampleRate) {
    // 简单的线性重采样（实际项目中应该使用更复杂的重采样算法）
    const resampledLength = Math.floor(length * config.value.sampleRate / sampleRate)
    const resampledData = new Float32Array(resampledLength)

    for (let i = 0; i < resampledLength; i++) {
      const originalIndex = i * sampleRate / config.value.sampleRate
      const index1 = Math.floor(originalIndex)
      const index2 = Math.min(index1 + 1, length - 1)
      const fraction = originalIndex - index1

      const channelData = audioBuffer.getChannelData(0)
      const value1 = channelData[index1] || 0
      const value2 = channelData[index2] || 0

      resampledData[i] = value1 * (1 - fraction) + value2 * fraction
    }

    return float32ToPCM16(resampledData)
  }

  // 直接转换
  return float32ToPCM16(audioBuffer.getChannelData(0))
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
    // 初始化音频录制
    const audioInitialized = await initAudioRecording()
    if (!audioInitialized) return

    // 生成会话ID
    const sessionId = Date.now().toString()

    // 连接实时语音识别
    isConnecting.value = true
    const connected = speechService.connectRealtime(
      sessionId,
      {
        model_type: config.value.modelType,
        vad_enabled: config.value.vadEnabled
      },
      handleTranscription,
      handleRecognitionError,
      () => {
        // WebSocket连接关闭回调
        console.log('语音识别连接已关闭')
      }
    )

    if (!connected) {
      error.value = '连接语音识别服务失败'
      return
    }

    // 开始录音
    isRecording.value = true
    recordingTime.value = 0

    // 开始MediaRecorder录制
    if (mediaRecorder.value) {
      mediaRecorder.value.start(100) // 每100ms触发一次dataavailable事件
    }

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

  // 停止MediaRecorder录制
  if (mediaRecorder.value && mediaRecorder.value.state === 'recording') {
    mediaRecorder.value.stop()
  }

  // 停止计时器
  if (timer.value) {
    clearInterval(timer.value)
    timer.value = null
  }

  // 发送结束标记
  speechService.sendAudioData(new ArrayBuffer(0), true)

  // 断开连接
  speechService.disconnectRealtime()

  // 清理音频资源
  cleanupAudioResources()

  emit('recording-stopped')
}

// 清理音频录制资源
const cleanupAudioResources = () => {
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
}>()

// 生命周期
onMounted(() => {
  checkDeviceType()
  checkMicrophonePermission()
  fetchConfig()

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

.recording-status {
  display: flex;
  flex-direction: column;
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
