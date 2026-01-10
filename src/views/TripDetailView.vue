<template>
  <div class="trip-detail-container">
    <el-card class="trip-info-card">
      <div class="trip-info-header">
        <h2>{{ currentTrip?.title }}</h2>
        <div class="trip-actions">
          <el-button @click="editTrip" size="small">
            <el-icon><Edit /></el-icon>
            编辑行程
          </el-button>
          <el-button @click="shareTrip" size="small">
            <el-icon><Share /></el-icon>
            分享
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
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTripStore } from '../stores/trip'
import { useUserStore } from '../stores/user'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import {
  Edit,
  Share,
  Location,
  Calendar,
  Plus,
  Delete,
  Money,
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const tripStore = useTripStore()
const userStore = useUserStore()

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

const shareTrip = () => {
  ElMessage.info('分享功能待实现')
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
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.trip-info-card {
  margin-bottom: 20px;
}

.trip-info-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.trip-info-header h2 {
  margin: 0;
}

.trip-actions {
  display: flex;
  gap: 10px;
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
  gap: 20px;
  flex-wrap: wrap;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #606266;
}

.trip-view-card {
  margin-bottom: 20px;
}

.timeline-section {
  padding: 20px 0;
}

.detail-card {
  margin-bottom: 10px;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.detail-header h3 {
  margin: 0;
  font-size: 16px;
}

.detail-content {
  margin-bottom: 15px;
}

.detail-time,
.detail-address,
.detail-description,
.detail-price {
  margin: 5px 0;
  font-size: 14px;
  color: #606266;
}

.detail-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.add-detail-section {
  margin-top: 20px;
  text-align: right;
}

.empty-state {
  padding: 40px 0;
  text-align: center;
}
</style>
