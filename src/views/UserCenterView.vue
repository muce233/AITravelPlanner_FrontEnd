<template>
  <div class="user-center-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <h2>用户中心</h2>
          <p>管理您的个人信息和偏好设置</p>
        </div>
      </template>
      
      <el-tabs v-model="activeTab" type="card">
        <!-- 个人信息 -->
        <el-tab-pane label="个人信息" name="profile">
          <el-form :model="userForm" :rules="userRules" ref="userFormRef" label-position="top">
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="用户名" prop="username">
                  <el-input
                    v-model="userForm.username"
                    placeholder="请输入用户名"
                    disabled
                  />
                </el-form-item>
              </el-col>
              
              <el-col :span="12">
                <el-form-item label="手机号" prop="phone_number">
                  <el-input
                    v-model="userForm.phone_number"
                    placeholder="请输入手机号"
                    disabled
                  />
                </el-form-item>
              </el-col>
            </el-row>
            
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="创建时间">
                  <el-input
                    v-model="userForm.created_at"
                    placeholder="创建时间"
                    disabled
                  />
                </el-form-item>
              </el-col>
              
              <el-col :span="12">
                <el-form-item label="更新时间">
                  <el-input
                    v-model="userForm.updated_at"
                    placeholder="更新时间"
                    disabled
                  />
                </el-form-item>
              </el-col>
            </el-row>
            
            <div class="form-actions">
              <el-button type="primary" @click="updateProfile" :loading="updating">
                更新信息
              </el-button>
              <el-button @click="resetForm">
                重置
              </el-button>
            </div>
          </el-form>
        </el-tab-pane>
        
        <!-- 偏好设置 -->
        <el-tab-pane label="偏好设置" name="preferences">
          <el-form :model="preferencesForm" ref="preferencesFormRef" label-position="top">
            <h3>旅行偏好</h3>
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="喜欢的景点类型">
                  <el-checkbox-group v-model="preferencesForm.attraction_types">
                    <el-checkbox label="历史文化">历史文化</el-checkbox>
                    <el-checkbox label="自然风光">自然风光</el-checkbox>
                    <el-checkbox label="主题乐园">主题乐园</el-checkbox>
                    <el-checkbox label="博物馆">博物馆</el-checkbox>
                    <el-checkbox label="美食探索">美食探索</el-checkbox>
                    <el-checkbox label="购物血拼">购物血拼</el-checkbox>
                  </el-checkbox-group>
                </el-form-item>
              </el-col>
              
              <el-col :span="12">
                <el-form-item label="饮食偏好">
                  <el-checkbox-group v-model="preferencesForm.food_preferences">
                    <el-checkbox label="中餐">中餐</el-checkbox>
                    <el-checkbox label="西餐">西餐</el-checkbox>
                    <el-checkbox label="日料">日料</el-checkbox>
                    <el-checkbox label="韩餐">韩餐</el-checkbox>
                    <el-checkbox label="素食">素食</el-checkbox>
                    <el-checkbox label="无辣不欢">无辣不欢</el-checkbox>
                  </el-checkbox-group>
                </el-form-item>
              </el-col>
            </el-row>
            
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="住宿偏好">
                  <el-radio-group v-model="preferencesForm.accommodation_preference">
                    <el-radio label="酒店">酒店</el-radio>
                    <el-radio label="民宿">民宿</el-radio>
                    <el-radio label="青旅">青旅</el-radio>
                    <el-radio label="公寓">公寓</el-radio>
                  </el-radio-group>
                </el-form-item>
              </el-col>
              
              <el-col :span="12">
                <el-form-item label="交通偏好">
                  <el-radio-group v-model="preferencesForm.transport_preference">
                    <el-radio label="飞机">飞机</el-radio>
                    <el-radio label="高铁">高铁</el-radio>
                    <el-radio label="自驾">自驾</el-radio>
                    <el-radio label="公共交通">公共交通</el-radio>
                  </el-radio-group>
                </el-form-item>
              </el-col>
            </el-row>
            
            <el-form-item label="其他偏好">
              <el-input
                v-model="preferencesForm.other_preferences"
                type="textarea"
                :rows="4"
                placeholder="请输入其他旅行偏好或特殊要求（可选）"
              />
            </el-form-item>
            
            <div class="form-actions">
              <el-button type="primary" @click="updatePreferences" :loading="updating">
                保存偏好
              </el-button>
              <el-button @click="resetPreferences">
                重置
              </el-button>
            </div>
          </el-form>
        </el-tab-pane>
        
        <!-- 账户安全 -->
        <el-tab-pane label="账户安全" name="security">
          <div class="security-section">
            <el-card class="security-card">
              <template #header>
                <div class="security-header">
                  <h3>修改密码</h3>
                  <el-icon><Lock /></el-icon>
                </div>
              </template>
              
              <el-form :model="passwordForm" :rules="passwordRules" ref="passwordFormRef" label-position="top">
                <el-form-item label="当前密码" prop="current_password">
                  <el-input
                    v-model="passwordForm.current_password"
                    type="password"
                    placeholder="请输入当前密码"
                    show-password
                  />
                </el-form-item>
                
                <el-form-item label="新密码" prop="new_password">
                  <el-input
                    v-model="passwordForm.new_password"
                    type="password"
                    placeholder="请输入新密码（至少6位）"
                    show-password
                  />
                </el-form-item>
                
                <el-form-item label="确认新密码" prop="confirm_password">
                  <el-input
                    v-model="passwordForm.confirm_password"
                    type="password"
                    placeholder="请再次输入新密码"
                    show-password
                  />
                </el-form-item>
                
                <div class="form-actions">
                  <el-button type="primary" @click="changePassword" :loading="updating">
                    修改密码
                  </el-button>
                  <el-button @click="resetPasswordForm">
                    重置
                  </el-button>
                </div>
              </el-form>
            </el-card>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Lock } from '@element-plus/icons-vue'

const router = useRouter()
const userStore = useUserStore()

// 表单引用
const userFormRef = ref<FormInstance>()
const preferencesFormRef = ref<FormInstance>()
const passwordFormRef = ref<FormInstance>()

// 激活的标签页
const activeTab = ref('profile')

// 加载状态
const updating = ref(false)

// 表单数据
const userForm = ref({
  username: '',
  phone_number: '',
  created_at: '',
  updated_at: ''
})

const preferencesForm = ref({
  attraction_types: [] as string[],
  food_preferences: [] as string[],
  accommodation_preference: '酒店',
  transport_preference: '飞机',
  other_preferences: ''
})

const passwordForm = ref({
  current_password: '',
  new_password: '',
  confirm_password: ''
})

// 表单规则
const userRules = ref<FormRules>({
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  phone_number: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号格式', trigger: 'blur' }
  ]
})

const passwordRules = ref<FormRules>({
  current_password: [
    { required: true, message: '请输入当前密码', trigger: 'blur' }
  ],
  new_password: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6个字符', trigger: 'blur' }
  ],
  confirm_password: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== passwordForm.value.new_password) {
          callback(new Error('两次输入密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
})

// 方法
const updateProfile = async () => {
  if (!userFormRef.value) return
  
  try {
    await userFormRef.value.validate()
    updating.value = true
    
    // 更新用户信息
    await userStore.updateUserProfile({
      username: userForm.value.username,
      phone_number: userForm.value.phone_number
    })
    
    ElMessage.success('信息更新成功')
  } catch (error) {
    ElMessage.error('信息更新失败')
  } finally {
    updating.value = false
  }
}

const updatePreferences = async () => {
  if (!preferencesFormRef.value) return
  
  try {
    updating.value = true
    
    // 更新用户偏好
    const preferences = {
      attraction_types: preferencesForm.value.attraction_types,
      food_preferences: preferencesForm.value.food_preferences,
      accommodation_preference: preferencesForm.value.accommodation_preference,
      transport_preference: preferencesForm.value.transport_preference,
      other_preferences: preferencesForm.value.other_preferences
    }
    
    await userStore.updateUserProfile({ preferences })
    
    ElMessage.success('偏好设置保存成功')
  } catch (error) {
    ElMessage.error('偏好设置保存失败')
  } finally {
    updating.value = false
  }
}

const changePassword = async () => {
  if (!passwordFormRef.value) return
  
  try {
    await passwordFormRef.value.validate()
    updating.value = true
    
    // 修改密码逻辑（待实现）
    ElMessage.success('密码修改功能待实现')
  } catch (error) {
    ElMessage.error('密码修改失败')
  } finally {
    updating.value = false
  }
}

const resetForm = () => {
  // 重置表单
  if (userStore.user) {
    userForm.value = {
      username: userStore.user.username,
      phone_number: userStore.user.phone_number,
      created_at: userStore.user.created_at,
      updated_at: userStore.user.updated_at
    }
  }
}

const resetPreferences = () => {
  // 重置偏好设置
  preferencesForm.value = {
    attraction_types: [],
    food_preferences: [],
    accommodation_preference: '酒店',
    transport_preference: '飞机',
    other_preferences: ''
  }
}

const resetPasswordForm = () => {
  // 重置密码表单
  passwordForm.value = {
    current_password: '',
    new_password: '',
    confirm_password: ''
  }
}

// 初始化数据
const initializeData = async () => {
  // 检查用户是否已登录
  await userStore.initialize()
  if (!userStore.isAuthenticated) {
    router.push('/login')
    return
  }
  
  // 加载用户信息
  const user = userStore.user
  if (user) {
    userForm.value = {
      username: user.username,
      phone_number: user.phone_number,
      created_at: user.created_at,
      updated_at: user.updated_at
    }
    
    // 加载用户偏好
    const preferences = user.preferences || {}
    preferencesForm.value = {
      attraction_types: preferences.attraction_types || [],
      food_preferences: preferences.food_preferences || [],
      accommodation_preference: preferences.accommodation_preference || '酒店',
      transport_preference: preferences.transport_preference || '飞机',
      other_preferences: preferences.other_preferences || ''
    }
  }
}

onMounted(() => {
  initializeData()
})
</script>

<style scoped>
.user-center-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}

.card-header {
  text-align: center;
}

.card-header h2 {
  margin: 0 0 8px 0;
}

.card-header p {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.form-actions {
  display: flex;
  gap: 10px;
  margin-top: 30px;
}

.security-section {
  padding: 20px 0;
}

.security-card {
  margin-bottom: 20px;
}

.security-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.security-header h3 {
  margin: 0;
  font-size: 16px;
}
</style>