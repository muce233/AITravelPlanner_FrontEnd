<template>
  <div class="register-container">
    <el-card class="register-card">
      <template #header>
        <div class="card-header">
          <h2>注册</h2>
          <p>创建AI旅行规划师账号</p>
        </div>
      </template>
      
      <el-form :model="registerForm" :rules="registerRules" ref="registerFormRef" label-position="top">
        <el-form-item label="用户名" prop="username">
          <el-input
            v-model="registerForm.username"
            placeholder="请输入用户名"
            prefix-icon="User"
          />
        </el-form-item>
        
        <el-form-item label="手机号" prop="phone_number">
          <el-input
            v-model="registerForm.phone_number"
            placeholder="请输入手机号"
            prefix-icon="Phone"
          />
        </el-form-item>
        
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="registerForm.password"
            type="password"
            placeholder="请输入密码（至少6位）"
            prefix-icon="Lock"
            show-password
          />
        </el-form-item>
        
        <el-form-item label="确认密码" prop="confirm_password">
          <el-input
            v-model="registerForm.confirm_password"
            type="password"
            placeholder="请再次输入密码"
            prefix-icon="Lock"
            show-password
          />
        </el-form-item>
        
        <el-form-item>
          <el-button
            type="primary"
            size="large"
            :loading="loading"
            @click="handleRegister"
            block
          >
            注册
          </el-button>
        </el-form-item>
        
        <div class="register-footer">
          <p>已有账号？<el-link type="primary" @click="$router.push('/login')">立即登录</el-link></p>
        </div>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage, FormInstance, FormRules } from 'element-plus'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'

const router = useRouter()
const userStore = useUserStore()
const registerFormRef = ref<FormInstance>()
const loading = ref(false)

const registerForm = ref({
  username: '',
  phone_number: '',
  password: '',
  confirm_password: ''
})

const registerRules = ref<FormRules>({
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 50, message: '用户名长度在 3 到 50 个字符', trigger: 'blur' }
  ],
  phone_number: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号格式', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6个字符', trigger: 'blur' }
  ],
  confirm_password: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== registerForm.value.password) {
          callback(new Error('两次输入密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
})

const handleRegister = async () => {
  if (!registerFormRef.value) return
  
  try {
    await registerFormRef.value.validate()
    loading.value = true
    
    await userStore.register(
      registerForm.value.username,
      registerForm.value.phone_number,
      registerForm.value.password
    )
    
    ElMessage.success('注册成功，请登录')
    router.push('/login')
  } catch (error: any) {
    if (error.response) {
      ElMessage.error(error.response.data.detail || '注册失败')
    } else {
      ElMessage.error('注册失败，请检查网络连接')
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.register-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f5f7fa;
  padding: 20px;
}

.register-card {
  width: 100%;
  max-width: 400px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
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

.register-footer {
  text-align: center;
  margin-top: 16px;
}

.register-footer p {
  margin: 0;
  color: #606266;
  font-size: 14px;
}
</style>