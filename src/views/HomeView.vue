<template>
  <div class="home-container">
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
            <p class="trip-destination">
              <el-icon><Location /></el-icon>
              {{ trip.destination || '未设置目的地' }}
            </p>
            <p class="trip-date">
              <el-icon><Calendar /></el-icon>
              {{ formatDateRange(trip.start_date, trip.end_date) }}
            </p>
            <p class="trip-budget">
              <el-icon><Wallet /></el-icon>
              预算: {{ trip.total_budget }} 元 | 已支出: {{ trip.actual_expense }} 元
            </p>
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
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Plus, Location, Calendar, Wallet } from '@element-plus/icons-vue'
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
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
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
}

.trips-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.trip-card {
  transition: transform 0.3s, box-shadow 0.3s;
}

.trip-card:hover {
  transform: translateY(-4px);
}

.trip-card-content {
  padding: 20px;
}

.trip-info h3 {
  margin: 0 0 15px 0;
  font-size: 20px;
  color: #303133;
}

.trip-info p {
  margin: 10px 0;
  color: #606266;
  display: flex;
  align-items: center;
  gap: 8px;
}

.trip-actions {
  margin-top: 20px;
  display: flex;
  gap: 10px;
}
</style>
