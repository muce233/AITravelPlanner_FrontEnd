<template>
  <div class="trip-create-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <h2>创建行程</h2>
          <p>填写旅行信息，AI将为您生成个性化行程</p>
        </div>
      </template>

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
      </el-form>

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
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { useRouter } from 'vue-router'
import { useTripStore } from '../stores/trip'

const router = useRouter()
const tripStore = useTripStore()
const tripFormRef = ref<FormInstance>()
const submitting = ref(false)

const tripForm = ref({
  title: '',
  destination: '',
  start_date: '',
  end_date: '',
  total_budget: 0,
  people_count: 1,
})

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

const handleSubmit = async () => {
  if (!tripFormRef.value) return

  try {
    await tripFormRef.value.validate()
    submitting.value = true

    const tripData = {
      title: tripForm.value.title,
      destination: tripForm.value.destination,
      start_date: tripForm.value.start_date,
      end_date: tripForm.value.end_date,
      total_budget: tripForm.value.total_budget,
    }

    const newTrip = await tripStore.createTrip(tripData)

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

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 30px;
}
</style>
