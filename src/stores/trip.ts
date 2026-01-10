import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import apiClient from '../utils/axios'

export interface Trip {
  id: string
  user_id: number
  title: string | null
  destination: string | null
  start_date: string | null
  end_date: string | null
  total_budget: number
  actual_expense: number
  created_at: string
  updated_at: string | null
}

export interface TripDetail {
  id: string
  trip_id: string
  day: number
  type: string
  name: string
  location: any
  address: string
  start_time: string
  end_time: string
  description: string
  price: number
  notes: string
  images: any[]
}

export interface Expense {
  id: number
  trip_id: string
  category: string
  amount: number
  currency: string
  date: string
  description: string
  receipt_image: string
}

export const useTripStore = defineStore('trip', () => {
  // 状态
  const trips = ref<Trip[]>([])
  const currentTrip = ref<Trip | null>(null)
  const tripDetails = ref<TripDetail[]>([])
  const expenses = ref<Expense[]>([])

  // 计算属性
  const sortedTrips = computed(() => {
    return [...trips.value].sort((a, b) => {
      return new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
    })
  })

  // 操作
  async function fetchTrips() {
    try {
      const response = await apiClient.get('/trips')
      trips.value = response.data
      return response
    } catch (error) {
      console.error('Failed to fetch trips:', error)
      throw error
    }
  }

  async function fetchTripById(tripId: string) {
    try {
      const response = await apiClient.get(`/trips/${tripId}`)
      currentTrip.value = response.data
      return response
    } catch (error) {
      console.error(`Failed to fetch trip ${tripId}:`, error)
      throw error
    }
  }

  async function createTrip(
    tripData: Omit<Trip, 'id' | 'user_id' | 'actual_expense' | 'created_at' | 'updated_at'>,
  ) {
    try {
      const response = await apiClient.post('/trips', tripData)
      trips.value.push(response.data)
      return response.data
    } catch (error) {
      console.error('Failed to create trip:', error)
      throw error
    }
  }

  async function createQuickTrip() {
    try {
      const response = await apiClient.post('/trips/quick')
      trips.value.push(response.data)
      return response.data
    } catch (error) {
      console.error('Failed to create quick trip:', error)
      throw error
    }
  }

  async function updateTrip(tripId: string, tripData: Partial<Trip>) {
    try {
      const response = await apiClient.put(`/trips/${tripId}`, tripData)
      const index = trips.value.findIndex((t) => t.id === tripId)
      if (index !== -1) {
        trips.value[index] = response.data
      }
      // 更新当前行程
      if (currentTrip.value?.id === tripId) {
        currentTrip.value = response.data
      }
      return response.data
    } catch (error) {
      console.error(`Failed to update trip ${tripId}:`, error)
      throw error
    }
  }

  async function deleteTrip(tripId: string) {
    try {
      await apiClient.delete(`/trips/${tripId}`)
      trips.value = trips.value.filter((t) => t.id !== tripId)
      if (currentTrip.value?.id === tripId) {
        currentTrip.value = null
        tripDetails.value = []
        expenses.value = []
      }
    } catch (error) {
      console.error(`Failed to delete trip ${tripId}:`, error)
      throw error
    }
  }

  async function generateAITrip(tripId: string) {
    try {
      const response = await apiClient.post(`/trips/${tripId}/generate`)
      return response
    } catch (error) {
      console.error(`Failed to generate AI trip for ${tripId}:`, error)
      throw error
    }
  }

  // 行程详情相关操作
  async function fetchTripDetails(tripId: string) {
    try {
      const response = await apiClient.get(`/trips/${tripId}/details`)
      tripDetails.value = response.data
      return response
    } catch (error) {
      console.error(`Failed to fetch trip details for ${tripId}:`, error)
      throw error
    }
  }

  async function createTripDetail(tripId: string, detailData: Omit<TripDetail, 'id' | 'trip_id'>) {
    try {
      const response = await apiClient.post(`/trips/${tripId}/details`, detailData)
      tripDetails.value.push(response.data)
      return response.data
    } catch (error) {
      console.error(`Failed to create trip detail for ${tripId}:`, error)
      throw error
    }
  }

  async function updateTripDetail(
    tripId: string,
    detailId: string,
    detailData: Partial<TripDetail>,
  ) {
    try {
      const response = await apiClient.put(`/trips/${tripId}/details/${detailId}`, detailData)
      const index = tripDetails.value.findIndex((d) => d.id === detailId)
      if (index !== -1) {
        tripDetails.value[index] = response.data
      }
      return response.data
    } catch (error) {
      console.error(`Failed to update trip detail ${detailId} for ${tripId}:`, error)
      throw error
    }
  }

  async function deleteTripDetail(tripId: string, detailId: string) {
    try {
      await apiClient.delete(`/trips/${tripId}/details/${detailId}`)
      tripDetails.value = tripDetails.value.filter((d) => d.id !== detailId)
    } catch (error) {
      console.error(`Failed to delete trip detail ${detailId} for ${tripId}:`, error)
      throw error
    }
  }

  // 费用相关操作
  async function fetchExpenses(tripId: string) {
    try {
      const response = await apiClient.get(`/trips/${tripId}/expenses`)
      expenses.value = response.data
      return response
    } catch (error) {
      console.error(`Failed to fetch expenses for ${tripId}:`, error)
      throw error
    }
  }

  async function createExpense(tripId: string, expenseData: Omit<Expense, 'id' | 'trip_id'>) {
    try {
      const response = await apiClient.post(`/trips/${tripId}/expenses`, expenseData)
      const newExpense = response.data
      expenses.value.push(newExpense)
      // 更新当前行程的实际支出
      if (currentTrip.value?.id === tripId) {
        currentTrip.value.actual_expense =
          response.data.trip?.actual_expense || currentTrip.value.actual_expense
      }
      return response.data
    } catch (error) {
      console.error(`Failed to create expense for ${tripId}:`, error)
      throw error
    }
  }

  async function updateExpense(tripId: string, expenseId: number, expenseData: Partial<Expense>) {
    try {
      const response = await apiClient.put(`/trips/${tripId}/expenses/${expenseId}`, expenseData)
      const index = expenses.value.findIndex((e) => e.id === expenseId)
      if (index !== -1) {
        expenses.value[index] = response.data
      }
      // 更新当前行程的实际支出
      if (currentTrip.value?.id === tripId) {
        currentTrip.value.actual_expense =
          response.data.trip?.actual_expense || currentTrip.value.actual_expense
      }
      return response.data
    } catch (error) {
      console.error(`Failed to update expense ${expenseId} for ${tripId}:`, error)
      throw error
    }
  }

  async function deleteExpense(tripId: string, expenseId: number) {
    try {
      await apiClient.delete(`/trips/${tripId}/expenses/${expenseId}`)
      expenses.value = expenses.value.filter((e) => e.id !== expenseId)
      // 更新当前行程的实际支出
      if (currentTrip.value?.id === tripId) {
        const totalExpense = expenses.value.reduce((sum, e) => sum + e.amount, 0)
        currentTrip.value.actual_expense = totalExpense
      }
    } catch (error) {
      console.error(`Failed to delete expense ${expenseId} for ${tripId}:`, error)
      throw error
    }
  }

  async function getBudgetAnalysis(tripId: string) {
    try {
      const response = await apiClient.get(`/trips/${tripId}/expenses/budget/analysis`)
      return response
    } catch (error) {
      console.error(`Failed to get budget analysis for ${tripId}:`, error)
      throw error
    }
  }

  // 重置状态
  function reset() {
    currentTrip.value = null
    tripDetails.value = []
    expenses.value = []
  }

  return {
    // 状态
    trips,
    currentTrip,
    tripDetails,
    expenses,
    // 计算属性
    sortedTrips,
    // 行程操作
    fetchTrips,
    fetchTripById,
    createTrip,
    createQuickTrip,
    updateTrip,
    deleteTrip,
    generateAITrip,
    // 行程详情操作
    fetchTripDetails,
    createTripDetail,
    updateTripDetail,
    deleteTripDetail,
    // 费用操作
    fetchExpenses,
    createExpense,
    updateExpense,
    deleteExpense,
    getBudgetAnalysis,
    // 辅助操作
    reset,
  }
})
