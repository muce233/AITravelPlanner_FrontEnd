<template>
  <div class="trip-detail-container">
    <!-- 行程基本信息 -->
    <el-card class="trip-info-card">
      <div class="trip-info-header">
        <h2>{{ currentTrip?.title }}</h2>
        <div class="trip-actions">
          <el-button type="primary" @click="$router.push(`/trips/${tripId}/budget`)" size="small">
            <el-icon><Money /></el-icon>
            预算管理
          </el-button>
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
            <span>{{ currentTrip?.destination }}</span>
          </div>
          <div class="info-item">
            <el-icon><Calendar /></el-icon>
            <span>{{ formatDateRange(currentTrip?.start_date, currentTrip?.end_date) }}</span>
          </div>
          <div class="info-item">
            <el-icon><Money /></el-icon>
            <span>预算: {{ currentTrip?.total_budget }} 元</span>
          </div>
          <div class="info-item">
            <el-icon><Wallet /></el-icon>
            <span>已支出: {{ currentTrip?.actual_expense }} 元</span>
          </div>
        </div>
        
        <div class="trip-progress">
          <el-progress
            :percentage="budgetUsage"
            :color="budgetUsageColor"
            :status="budgetStatus"
          />
          <span class="progress-text">{{ budgetUsage }}% 预算已使用</span>
        </div>
      </div>
    </el-card>
    
    <!-- 行程视图切换 -->
    <el-card class="trip-view-card">
      <el-tabs v-model="activeView" type="card">
        <!-- 地图视图 -->
        <el-tab-pane label="地图视图" name="map">
          <div class="map-section">
            <div class="map-placeholder">
              <el-icon class="map-icon"><Map /></el-icon>
              <p>地图视图将在这里显示</p>
              <p class="map-hint">所有行程点将在地图上标记，点击标记可查看详情</p>
            </div>
          </div>
        </el-tab-pane>
        
        <!-- 时间轴视图 -->
        <el-tab-pane label="时间轴视图" name="timeline">
          <div class="timeline-section">
            <el-collapse v-model="activeDays" accordion>
              <el-collapse-item
                v-for="day in days"
                :key="day"
                :title="`第 ${day} 天`"
              >
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
                        <el-tag :type="getDetailTypeColor(detail.type)">{{ getDetailTypeName(detail.type) }}</el-tag>
                      </div>
                      
                      <div class="detail-content">
                        <p class="detail-time">{{ formatTimeRange(detail.start_time, detail.end_time) }}</p>
                        <p class="detail-address" v-if="detail.address">{{ detail.address }}</p>
                        <p class="detail-description" v-if="detail.description">{{ detail.description }}</p>
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
        </el-tab-pane>
      </el-tabs>
    </el-card>
    
    <!-- 添加费用记录入口 -->
    <div class="add-expense-section">
      <el-button
        type="success"
        size="large"
        @click="$router.push(`/trips/${tripId}/budget/add`)"
        block
      >
        <el-icon><Plus /></el-icon>
        添加费用记录
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTripStore } from '../stores/trip'
import { useUserStore } from '../stores/user'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Money, Edit, Share, Location, Calendar, Wallet, 
  Map, Plus, Delete 
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const tripStore = useTripStore()
const userStore = useUserStore()

// 从路由参数获取行程ID
const tripId = computed(() => parseInt(route.params.id as string))

// 当前行程和详情
const currentTrip = computed(() => tripStore.currentTrip)
const tripDetails = computed(() => tripStore.tripDetails)

// 视图切换
const activeView = ref('map')
const activeDays = ref([1])

// 计算属性
const days = computed(() => {
  const daySet = new Set(tripDetails.value.map(detail => detail.day))
  return Array.from(daySet).sort((a, b) => a - b)
})

const budgetUsage = computed(() => {
  if (!currentTrip.value || currentTrip.value.total_budget === 0) return 0
  const usage = (currentTrip.value.actual_expense / currentTrip.value.total_budget) * 100
  return Math.round(usage)
})

const budgetUsageColor = computed(() => {
  if (budgetUsage.value < 70) return '#67c23a'
  if (budgetUsage.value < 90) return '#e6a23c'
  return '#f56c6c'
})

const budgetStatus = computed(() => {
  if (budgetUsage.value >= 100) return 'exception'
  if (budgetUsage.value >= 90) return 'warning'
  return 'success'
})

// 方法
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
    .filter(detail => detail.day === day)
    .sort((a, b) => {
      const timeA = new Date(a.start_time || 0).getTime()
      const timeB = new Date(b.start_time || 0).getTime()
      return timeA - timeB
    })
}

const getDetailTypeColor = (type: string) => {
  const colorMap: Record<string, string> = {
    '景点': 'primary',
    '住宿': 'success',
    '餐厅': 'warning',
    '交通': 'info'
  }
  return colorMap[type] || 'default'
}

const getDetailTypeName = (type: string) => {
  return type
}

const editTrip = () => {
  // 编辑行程逻辑
  ElMessage.info('编辑行程功能待实现')
}

const shareTrip = () => {
  // 分享行程逻辑
  ElMessage.info('分享功能待实现')
}

const addDetail = (day: number) => {
  // 添加行程点逻辑
  ElMessage.info('添加行程点功能待实现')
}

const editDetail = (detail: any) => {
  // 编辑行程点逻辑
  ElMessage.info('编辑行程点功能待实现')
}

const deleteDetail = async (detail: any) => {
  try {
    await ElMessageBox.confirm('确定要删除这个行程点吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await tripStore.deleteTripDetail(tripId.value, detail.id)
    ElMessage.success('行程点删除成功')
  } catch (error) {
    // 取消删除
  }
}

// 初始化数据
const fetchData = async () => {
  // 检查用户是否已登录
  await userStore.initialize()
  if (!userStore.isAuthenticated) {
    router.push('/login')
    return
  }
  
  // 获取行程详情
  await tripStore.fetchTripById(tripId.value)
  await tripStore.fetchTripDetails(tripId.value)
  await tripStore.fetchExpenses(tripId.value)
}

// 监听行程ID变化
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

.trip-progress {
  flex: 1;
  min-width: 300px;
}

.progress-text {
  display: block;
  text-align: right;
  margin-top: 5px;
  font-size: 14px;
  color: #606266;
}

.trip-view-card {
  margin-bottom: 20px;
}

.map-section {
  height: 500px;
}

.map-placeholder {
  width: 100%;
  height: 100%;
  background-color: #f0f2f5;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #909399;
}

.map-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.map-hint {
  font-size: 14px;
  margin-top: 10px;
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

.add-expense-section {
  margin-top: 20px;
}
</style>