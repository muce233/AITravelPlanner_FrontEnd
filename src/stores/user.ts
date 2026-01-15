import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import apiClient from '../utils/axios'

export interface User {
  id: number
  username: string
  phone_number: string
  avatar?: string
  preferences: any
  created_at: string
  updated_at: string
}

export const useUserStore = defineStore('user', () => {
  // 状态
  const user = ref<User | null>(null)
  const isAuthenticated = computed(() => !!user.value)
  const token = ref<string | null>(localStorage.getItem('token'))

  // 操作
  async function login(username: string, password: string) {
    try {
      const response = await apiClient.post('/auth/login', {
        username,
        password,
      })
      token.value = response.data.access_token
      localStorage.setItem('token', response.data.access_token)
      await fetchUserProfile()
      return response.data
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    }
  }

  async function logout() {
    try {
      await apiClient.post('/auth/logout')
    } finally {
      // 无论请求是否成功，都清除本地状态
      user.value = null
      token.value = null
      localStorage.removeItem('token')
    }
  }

  async function fetchUserProfile() {
    try {
      const response = await apiClient.get('/users/profile')
      user.value = response.data
      return response
    } catch (error) {
      console.error('Failed to fetch user profile:', error)
      throw error
    }
  }

  async function updateUserProfile(updates: Partial<User>) {
    try {
      const response = await apiClient.put('/users/profile', updates)
      user.value = response.data
      return response.data
    } catch (error) {
      console.error('Failed to update user profile:', error)
      throw error
    }
  }

  // 初始化时检查本地token并获取用户信息
  async function initialize() {
    if (token.value) {
      try {
        await fetchUserProfile()
      } catch (error) {
        // 如果获取用户信息失败，清除token
        console.error('Failed to initialize user:', error)
        logout()
      }
    }
  }

  return {
    user,
    isAuthenticated,
    token,
    login,
    logout,
    fetchUserProfile,
    updateUserProfile,
    initialize,
  }
})
