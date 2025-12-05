<template>
  <div class="home-container">
    <h1>AI旅行规划师</h1>
    <p>智能生成个性化旅行计划，轻松管理旅行预算</p>
    <!-- 地图显示区域 -->
    <div class="map-section">
      <h2>地图视图</h2>
      <div class="map-placeholder">地图将在这里显示</div>
    </div>
    
    <!-- 快速创建行程入口 -->
    <div class="quick-create-section">
      <el-button type="primary" size="large" @click="$router.push('/trips/create')">
        <el-icon><Plus /></el-icon>
        快速创建行程
      </el-button>
    </div>
    
    <!-- 历史行程列表 -->
    <div class="trips-section">
      <h2>历史行程</h2>
      <el-empty v-if="trips.length === 0" description="暂无行程" />
      <el-card v-else :body-style="{ padding: '0px' }">
        <el-timeline>
          <el-timeline-item
            v-for="trip in trips"
            :key="trip.id"
            :timestamp="formatDate(trip.start_date)"
            placement="top"
          >
            <el-card>
              <h3>{{ trip.title }}</h3>
              <p>{{ trip.destination }} | {{ formatDateRange(trip.start_date, trip.end_date) }}</p>
              <p>预算: {{ trip.total_budget }} 元 | 已支出: {{ trip.actual_expense }} 元</p>
              <el-button-group>
                <el-button type="primary" @click="$router.push(`/trips/${trip.id}`)">
                  查看详情
                </el-button>
                <el-button @click="$router.push(`/trips/${trip.id}/budget`)">
                  预算管理
                </el-button>
              </el-button-group>
            </el-card>
          </el-timeline-item>
        </el-timeline>
      </el-card>
    </div>
    
    <!-- 语音输入按钮 -->
    <div class="voice-input-section">
      <el-button circle type="success" size="large">
        <el-icon><Microphone /></el-icon>
      </el-button>
      <p>语音创建行程</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Plus, Microphone } from '@element-plus/icons-vue'
import { useTripStore } from '../stores/trip'
import { useUserStore } from '../stores/user'

const tripStore = useTripStore()
const userStore = useUserStore()
const trips = ref<any[]>([])

// 格式化日期
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString()
}

// 格式化日期范围
const formatDateRange = (startDate: string, endDate: string) => {
  const start = new Date(startDate)
  const end = new Date(endDate)
  return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`
}

// 初始化数据
onMounted(async () => {
  // 检查用户是否已登录
  await userStore.initialize()
  if (userStore.isAuthenticated) {
    // 获取用户行程
    await tripStore.fetchTrips()
    trips.value = tripStore.sortedTrips
  } else {
    // 跳转到登录页面
    window.location.href = '/login'
  }
})
</script>

<style scoped>
.home-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.map-section {
  margin-bottom: 30px;
}

.map-placeholder {
  width: 100%;
  height: 400px;
  background-color: #f0f2f5;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
  font-size: 18px;
}

.quick-create-section {
  margin-bottom: 30px;
  text-align: center;
}

.trips-section {
  margin-bottom: 30px;
}

.voice-input-section {
  text-align: center;
  margin-top: 50px;
}

.voice-input-section p {
  margin-top: 10px;
  color: #606266;
}
</style>