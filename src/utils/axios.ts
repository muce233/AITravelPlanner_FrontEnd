import axios from 'axios'

// 创建axios实例
export const apiClient = axios.create({
  baseURL: 'http://localhost:8000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 流式请求函数
export const streamClient = {
  async post<T>(
    url: string,
    data?: any,
    onMessage?: (chunk: T) => void,
    onComplete?: () => void,
    onError?: (error: Error) => void
  ) {
    const token = localStorage.getItem('token')

    try {
      const response = await fetch(`${apiClient.defaults.baseURL}${url}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      if (!response.body) {
        throw new Error('Response body is null')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          onComplete?.()
          break
        }

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmedLine = line.trim()

          if (trimmedLine === '') continue
          if (trimmedLine === '[DONE]') {
            onComplete?.()
            return
          }

          if (trimmedLine.startsWith('data: ')) {
            const jsonStr = trimmedLine.slice(6)

            try {
              const chunk = JSON.parse(jsonStr) as T
              
              // 检查是否有错误信息
              if (chunk && (chunk as any).error) {
                onError?.(new Error((chunk as any).error))
                return
              }
              
              onMessage?.(chunk)
            } catch (error) {
              console.error('Error parsing chunk:', error)
            }
          }
        }
      }
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error('Unknown error'))
    }
  }
}

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
    return response
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
