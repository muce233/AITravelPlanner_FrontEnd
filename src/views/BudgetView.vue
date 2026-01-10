<template>
  <div class="budget-container">
    <!-- 预算概览 -->
    <el-card class="budget-overview-card">
      <template #header>
        <div class="card-header">
          <h2>预算管理</h2>
          <p>{{ currentTrip?.title }} - 费用统计</p>
        </div>
      </template>
      
      <div class="budget-overview-content">
        <el-row :gutter="20">
          <el-col :span="8">
            <div class="stat-card">
              <div class="stat-label">总预算</div>
              <div class="stat-value total-budget">{{ currentTrip?.total_budget }} 元</div>
            </div>
          </el-col>
          
          <el-col :span="8">
            <div class="stat-card">
              <div class="stat-label">已支出</div>
              <div class="stat-value actual-expense">{{ currentTrip?.actual_expense }} 元</div>
            </div>
          </el-col>
          
          <el-col :span="8">
            <div class="stat-card">
              <div class="stat-label">剩余预算</div>
              <div class="stat-value remaining-budget">{{ remainingBudget }} 元</div>
            </div>
          </el-col>
        </el-row>
        
        <div class="budget-chart-section">
          <h3>预算使用情况</h3>
          <div class="chart-placeholder">
            <el-icon class="chart-icon"><PieChart /></el-icon>
            <p>预算使用图表将在这里显示</p>
            <p class="chart-hint">按类别统计的费用分布</p>
          </div>
        </div>
      </div>
    </el-card>
    
    <!-- 费用记录列表 -->
    <el-card class="expenses-card">
      <template #header>
        <div class="card-header">
          <h2>费用记录</h2>
          <div class="expense-actions">
            <el-button type="primary" @click="addExpense" size="small">
              <el-icon><Plus /></el-icon>
              添加费用
            </el-button>
            <el-button type="success" @click="recordVoiceExpense" size="small">
              <el-icon><Microphone /></el-icon>
              语音记录
            </el-button>
            <el-button @click="exportExpenses" size="small">
              <el-icon><Download /></el-icon>
              导出报表
            </el-button>
          </div>
        </div>
      </template>
      
      <div class="expenses-content">
        <!-- 筛选和搜索 -->
        <div class="expense-filters">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索费用描述"
            prefix-icon="Search"
            style="width: 300px; margin-right: 10px"
          />
          
          <el-select
            v-model="categoryFilter"
            placeholder="按类别筛选"
            style="width: 150px; margin-right: 10px"
          >
            <el-option label="全部" value="" />
            <el-option label="餐饮" value="餐饮" />
            <el-option label="交通" value="交通" />
            <el-option label="住宿" value="住宿" />
            <el-option label="购物" value="购物" />
            <el-option label="其他" value="其他" />
          </el-select>
          
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            style="width: 300px"
          />
        </div>
        
        <!-- 费用列表 -->
        <el-table
          v-loading="loading"
          :data="filteredExpenses"
          style="width: 100%"
          border
        >
          <el-table-column prop="date" label="日期" width="150" />
          <el-table-column prop="category" label="类别" width="120">
            <template #default="scope">
              <el-tag :type="getCategoryColor(scope.row.category)">{{ scope.row.category }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="description" label="描述" />
          <el-table-column prop="amount" label="金额" width="120" align="right">
            <template #default="scope">
              <span class="amount-text">{{ scope.row.amount }} 元</span>
            </template>
          </el-table-column>
          <el-table-column prop="currency" label="货币" width="100" />
          <el-table-column label="操作" width="150" fixed="right">
            <template #default="scope">
              <el-button size="small" @click="editExpense(scope.row)">
                <el-icon><Edit /></el-icon>
                编辑
              </el-button>
              <el-button size="small" type="danger" @click="deleteExpense(scope.row)">
                <el-icon><Delete /></el-icon>
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        
        <!-- 分页 -->
        <div class="pagination-section">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next, jumper"
            :total="filteredExpenses.length"
          />
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTripStore } from '../stores/trip'
import { useUserStore } from '../stores/user'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  PieChart, Plus, Microphone, Download, 
  Edit, Delete, Search 
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const tripStore = useTripStore()
const userStore = useUserStore()

// 从路由参数获取行程ID
const tripId = computed(() => route.params.id as string)

// 当前行程和费用
const currentTrip = computed(() => tripStore.currentTrip)
const expenses = computed(() => tripStore.expenses)

// 筛选条件
const searchKeyword = ref('')
const categoryFilter = ref('')
const dateRange = ref<any[]>([])

// 分页
const currentPage = ref(1)
const pageSize = ref(10)

// 加载状态
const loading = ref(false)

// 计算属性
const remainingBudget = computed(() => {
  return (currentTrip.value?.total_budget || 0) - (currentTrip.value?.actual_expense || 0)
})

const filteredExpenses = computed(() => {
  let result = [...expenses.value]
  
  // 按关键词筛选
  if (searchKeyword.value) {
    result = result.filter(expense => 
      expense.description?.includes(searchKeyword.value)
    )
  }
  
  // 按类别筛选
  if (categoryFilter.value) {
    result = result.filter(expense => 
      expense.category === categoryFilter.value
    )
  }
  
  // 按日期范围筛选
  if (dateRange.value && dateRange.value.length === 2) {
    const startDate = new Date(dateRange.value[0])
    const endDate = new Date(dateRange.value[1])
    endDate.setHours(23, 59, 59, 999)
    
    result = result.filter(expense => {
      const expenseDate = new Date(expense.date)
      return expenseDate >= startDate && expenseDate <= endDate
    })
  }
  
  // 按日期排序
  result.sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime()
  })
  
  return result
})

// 方法
const getCategoryColor = (category: string) => {
  const colorMap: Record<string, string> = {
    '餐饮': 'warning',
    '交通': 'info',
    '住宿': 'success',
    '购物': 'primary',
    '其他': 'default'
  }
  return colorMap[category] || 'default'
}

const addExpense = () => {
  // 添加费用记录逻辑
  ElMessage.info('添加费用记录功能待实现')
}

const recordVoiceExpense = () => {
  // 语音记录费用逻辑
  ElMessage.info('语音记录费用功能待实现')
}

const editExpense = (expense: any) => {
  // 编辑费用记录逻辑
  ElMessage.info('编辑费用记录功能待实现')
}

const deleteExpense = async (expense: any) => {
  try {
    await ElMessageBox.confirm('确定要删除这条费用记录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await tripStore.deleteExpense(tripId.value, expense.id)
    ElMessage.success('费用记录删除成功')
  } catch (error) {
    // 取消删除
  }
}

const exportExpenses = () => {
  // 导出费用记录逻辑
  ElMessage.info('导出费用记录功能待实现')
}

// 初始化数据
const fetchData = async () => {
  // 检查用户是否已登录
  await userStore.initialize()
  if (!userStore.isAuthenticated) {
    router.push('/login')
    return
  }
  
  // 获取行程详情和费用记录
  await tripStore.fetchTripById(tripId.value)
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
.budget-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.budget-overview-card,
.expenses-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h2 {
  margin: 0;
  font-size: 20px;
}

.card-header p {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.budget-overview-content {
  padding: 20px 0;
}

.stat-card {
  background-color: #f5f7fa;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
}

.stat-label {
  font-size: 14px;
  color: #606266;
  margin-bottom: 10px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
}

.total-budget {
  color: #67c23a;
}

.actual-expense {
  color: #f56c6c;
}

.remaining-budget {
  color: #409eff;
}

.budget-chart-section {
  margin-top: 30px;
}

.budget-chart-section h3 {
  margin-bottom: 20px;
  font-size: 16px;
}

.chart-placeholder {
  width: 100%;
  height: 300px;
  background-color: #f0f2f5;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #909399;
}

.chart-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.chart-hint {
  font-size: 14px;
  margin-top: 10px;
}

.expense-actions {
  display: flex;
  gap: 10px;
}

.expenses-content {
  padding: 20px 0;
}

.expense-filters {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.chart-placeholder {
  width: 100%;
  height: 300px;
  background-color: #f0f2f5;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #909399;
}

.pagination-section {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.amount-text {
  font-weight: bold;
  color: #f56c6c;
}
</style>