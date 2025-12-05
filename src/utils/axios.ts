import axios from 'axios'

// 创建axios实例
const apiClient = axios.create({
  baseURL: 'http://localhost:8000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
apiClient.interceptors.request.use(
  config => {
    // 从本地存储获取token
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 响应拦截器
apiClient.interceptors.response.use(
  response => {
    return response.data
  },
  error => {
    // 处理错误响应
    if (error.response) {
      // 服务器返回错误状态码
      console.error('API Error:', error.response.data)
      // 可以根据不同状态码进行处理
      if (error.response.status === 401) {
        // 未授权，清除token并跳转到登录页
        localStorage.removeItem('token')
        window.location.href = '/login'
      }
    } else if (error.request) {
      // 请求已发送但没有收到响应
      console.error('Network Error:', error.request)
    } else {
      // 请求配置出错
      console.error('Request Error:', error.message)
    }
    return Promise.reject(error)
  }
)

export default apiClient