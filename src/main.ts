import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

import App from './App.vue'
import router from './router'
import { useUserStore } from './stores/user'

const app = createApp(App)

const pinia = createPinia()
app.use(pinia)
app.use(router)
app.use(ElementPlus)

// 应用挂载前初始化用户状态
const userStore = useUserStore()
userStore.initialize().then(() => {
  app.mount('#app')
}).catch((error) => {
  console.error('用户状态初始化失败:', error)
  app.mount('#app')
})
