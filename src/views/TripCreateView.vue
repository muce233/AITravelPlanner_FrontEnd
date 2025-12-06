<template>
  <div class="trip-create-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <h2>创建行程</h2>
          <p>填写旅行信息，AI将为您生成个性化行程</p>
        </div>
      </template>

      <el-tabs v-model="activeTab" type="card">
        <!-- 表单输入 -->
        <el-tab-pane label="表单输入" name="form">
          <el-form :model="tripForm" :rules="tripRules" ref="tripFormRef" label-position="top">
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="行程标题" prop="title">
                  <el-input
                    v-model="tripForm.title"
                    placeholder="请输入行程标题（如：北京五日游）"
                  />
                </el-form-item>
              </el-col>

              <el-col :span="12">
                <el-form-item label="目的地" prop="destination">
                  <el-input v-model="tripForm.destination" placeholder="请输入目的地（如：北京）" />
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="开始日期" prop="start_date">
                  <el-date-picker
                    v-model="tripForm.start_date"
                    type="date"
                    placeholder="选择开始日期"
                    style="width: 100%"
                    format="YYYY-MM-DD"
                    value-format="YYYY-MM-DD"
                  />
                </el-form-item>
              </el-col>

              <el-col :span="12">
                <el-form-item label="结束日期" prop="end_date">
                  <el-date-picker
                    v-model="tripForm.end_date"
                    type="date"
                    placeholder="选择结束日期"
                    style="width: 100%"
                    format="YYYY-MM-DD"
                    value-format="YYYY-MM-DD"
                  />
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="总预算（元）" prop="total_budget">
                  <el-input-number
                    v-model="tripForm.total_budget"
                    :min="0"
                    :step="100"
                    placeholder="请输入总预算"
                    style="width: 100%"
                  />
                </el-form-item>
              </el-col>

              <el-col :span="12">
                <el-form-item label="旅行人数" prop="people_count">
                  <el-input-number
                    v-model="tripForm.people_count"
                    :min="1"
                    :step="1"
                    placeholder="请输入旅行人数"
                    style="width: 100%"
                  />
                </el-form-item>
              </el-col>
            </el-row>

            <el-form-item label="旅行偏好" prop="preferences">
              <el-checkbox-group v-model="tripForm.preferences">
                <el-checkbox
                  v-for="preference in preferenceOptions"
                  :key="preference.value"
                  :label="preference.value"
                >
                  {{ preference.label }}
                </el-checkbox>
              </el-checkbox-group>
            </el-form-item>

            <el-form-item label="详细说明">
              <el-input
                v-model="tripForm.description"
                type="textarea"
                :rows="4"
                placeholder="请输入更多旅行偏好或特殊要求（可选）"
              />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 语音输入 -->
        <el-tab-pane label="语音输入" name="voice">
          <div class="voice-input-section">
            <div class="voice-placeholder">
              <el-icon class="voice-icon"><Microphone /></el-icon>
              <p>点击下方按钮开始语音输入</p>
              <p class="voice-hint">
                请清晰说出您的旅行需求，例如："我想下个月去北京玩5天，预算5000元，两个人，喜欢历史文化景点"
              </p>
            </div>

            <div class="voice-controls">
              <el-button
                type="success"
                size="large"
                :icon="isRecording ? 'Close' : 'Microphone'"
                :loading="isRecording"
                @click="toggleRecording"
              >
                {{ isRecording ? '停止录音' : '开始录音' }}
              </el-button>

              <el-button
                type="primary"
                size="large"
                @click="transcribeVoice"
                :disabled="!isRecording"
              >
                识别语音
              </el-button>
            </div>

            <el-form-item label="识别结果">
              <el-input
                v-model="voiceResult"
                type="textarea"
                :rows="4"
                placeholder="语音识别结果将显示在这里"
              />
            </el-form-item>
          </div>
        </el-tab-pane>
      </el-tabs>

      <div class="form-actions">
        <el-button @click="$router.back()">取消</el-button>
        <el-button type="primary" size="large" :loading="submitting" @click="handleSubmit">
          生成行程
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { useRouter } from 'vue-router'
import { useTripStore } from '../stores/trip'
import { Microphone, Close } from '@element-plus/icons-vue'

const router = useRouter()
const tripStore = useTripStore()
const tripFormRef = ref<FormInstance>()
const activeTab = ref('form')
const submitting = ref(false)

// 语音输入状态
const isRecording = ref(false)
const voiceResult = ref('')

// 旅行偏好选项
const preferenceOptions = [
  { label: '历史文化', value: 'history' },
  { label: '自然风光', value: 'nature' },
  { label: '美食探索', value: 'food' },
  { label: '购物血拼', value: 'shopping' },
  { label: '休闲度假', value: 'relax' },
  { label: '冒险探索', value: 'adventure' },
  { label: '亲子游', value: 'family' },
  { label: '情侣游', value: 'couple' },
]

// 表单数据
const tripForm = ref({
  title: '',
  destination: '',
  start_date: '',
  end_date: '',
  total_budget: 0,
  people_count: 1,
  preferences: [] as string[],
  description: '',
})

// 表单验证规则
const tripRules = ref<FormRules>({
  title: [{ required: true, message: '请输入行程标题', trigger: 'blur' }],
  destination: [{ required: true, message: '请输入目的地', trigger: 'blur' }],
  start_date: [{ required: true, message: '请选择开始日期', trigger: 'change' }],
  end_date: [
    { required: true, message: '请选择结束日期', trigger: 'change' },
    {
      validator: (rule, value, callback) => {
        if (
          value &&
          tripForm.value.start_date &&
          new Date(value) < new Date(tripForm.value.start_date)
        ) {
          callback(new Error('结束日期不能早于开始日期'))
        } else {
          callback()
        }
      },
      trigger: 'change',
    },
  ],
  total_budget: [
    { required: true, message: '请输入总预算', trigger: 'blur' },
    { min: 0, message: '预算不能为负数', trigger: 'blur' },
  ],
  people_count: [
    { required: true, message: '请输入旅行人数', trigger: 'blur' },
    { min: 1, message: '人数不能少于1人', trigger: 'blur' },
  ],
})

// 切换录音状态
const toggleRecording = () => {
  isRecording.value = !isRecording.value
  if (!isRecording.value) {
    // 停止录音逻辑
    ElMessage.info('录音已停止')
  } else {
    // 开始录音逻辑
    ElMessage.info('录音已开始')
  }
}

// 转写语音
const transcribeVoice = () => {
  // 模拟语音转写
  voiceResult.value = '我想下个月去北京玩5天，预算5000元，两个人，喜欢历史文化景点'
  ElMessage.success('语音识别完成')
}

// 提交表单
const handleSubmit = async () => {
  if (!tripFormRef.value) return

  try {
    await tripFormRef.value.validate()
    submitting.value = true

    // 创建行程
    const tripData = {
      title: tripForm.value.title,
      destination: tripForm.value.destination,
      start_date: tripForm.value.start_date,
      end_date: tripForm.value.end_date,
      total_budget: tripForm.value.total_budget,
    }

    const newTrip = await tripStore.createTrip(tripData)

    // 生成AI行程
    await tripStore.generateAITrip(newTrip.id)
    ElMessage.success('AI行程生成成功')
    router.push(`/trips/${newTrip.id}`)
  } catch (error: any) {
    ElMessage.error(error.response?.data?.detail || '行程创建失败')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.trip-create-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}

.card-header {
  text-align: center;
}

.card-header h2 {
  margin: 0 0 8px 0;
  color: #303133;
}

.card-header p {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.voice-input-section {
  padding: 20px;
  background-color: #f5f7fa;
  border-radius: 8px;
}

.voice-placeholder {
  text-align: center;
  padding: 40px 20px;
  background-color: #fff;
  border-radius: 8px;
  margin-bottom: 20px;
}

.voice-icon {
  font-size: 48px;
  color: #67c23a;
  margin-bottom: 16px;
}

.voice-hint {
  color: #909399;
  font-size: 14px;
  margin-top: 10px;
}

.voice-controls {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-bottom: 20px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 30px;
}
</style>
