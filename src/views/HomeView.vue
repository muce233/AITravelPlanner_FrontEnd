<template>
  <div class="home-container">
    <div class="home-content">
      <div class="header-section">
        <h1>我的行程</h1>
        <el-button type="primary" @click="handleCreateTrip" :loading="creating">
          <el-icon><Plus /></el-icon>
          创建行程
        </el-button>
      </div>

      <el-empty v-if="trips.length === 0" description="暂无行程，点击上方按钮创建新行程" />
      <div v-else class="trips-list">
        <el-card
          v-for="trip in trips"
          :key="trip.id"
          class="trip-card"
          shadow="hover"
        >
          <div class="trip-card-content">
            <div class="trip-info">
              <h3>{{ trip.title || '未命名行程' }}</h3>
              <div class="trip-basic-info">
                <div class="info-item">
                  <el-icon><Location /></el-icon>
                  <span>{{ trip.destination || '未设置目的地' }}</span>
                </div>
                <div class="info-item">
                  <el-icon><Calendar /></el-icon>
                  <span>{{ formatDateRange(trip.start_date, trip.end_date) }}</span>
                </div>
              </div>
            </div>
            <div class="trip-actions">
              <el-button type="primary" @click="$router.push(`/trips/${trip.id}`)">
                查看详情
              </el-button>
            </div>
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Plus, Location, Calendar } from '@element-plus/icons-vue'
import { useTripStore } from '../stores/trip'
import { useUserStore } from '../stores/user'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'

const router = useRouter()
const tripStore = useTripStore()
const userStore = useUserStore()
const trips = ref<any[]>([])
const creating = ref(false)

const formatDateRange = (startDate: string, endDate: string) => {
  if (!startDate || !endDate) {
    return '日期未设置'
  }
  const start = new Date(startDate)
  const end = new Date(endDate)
  return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`
}

const handleCreateTrip = async () => {
  try {
    creating.value = true
    const newTrip = await tripStore.createQuickTrip()
    ElMessage.success('行程创建成功')
    router.push(`/trips/${newTrip.id}`)
  } catch (error: any) {
    ElMessage.error(error.response?.data?.detail || '行程创建失败')
  } finally {
    creating.value = false
  }
}

onMounted(async () => {
  await userStore.initialize()
  if (userStore.isAuthenticated) {
    await tripStore.fetchTrips()
    trips.value = tripStore.sortedTrips
  } else {
    window.location.href = '/login'
  }
})
</script>

<style scoped>
.home-container {
  width: 100%;
  min-height: 100vh;
  padding: 20px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
}

.home-content {
  max-width: 1200px;
  margin: 0 auto;
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.header-section h1 {
  margin: 0;
  font-size: 28px;
  color: #303133;
  font-weight: 600;
}

.trips-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.trip-card {
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border: none;
  transition: transform 0.3s, box-shadow 0.3s;
}

.trip-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.trip-card :deep(.el-card__body) {
  padding: 24px;
}

.trip-card-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.trip-info h3 {
  margin: 0 0 15px 0;
  font-size: 20px;
  color: #303133;
  font-weight: 600;
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

.trip-actions {
  display: flex;
  gap: 10px;
}

.trip-actions .el-button {
  border-radius: 8px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.trip-actions .el-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}
</style>
