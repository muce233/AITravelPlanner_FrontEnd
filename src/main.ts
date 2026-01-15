import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import 'element-plus/dist/index.css'

import App from './App.vue'
import router from './router'
import { useUserStore } from './stores/user'
import { loadApiConfig } from './utils/axios'

const app = createApp(App)

const pinia = createPinia()
app.use(pinia)
app.use(router)
app.use(ElementPlus, {
  locale: zhCn,
})

loadApiConfig().then(() => {
  const userStore = useUserStore()
  userStore.initialize().then(() => {
    app.mount('#app')
  }).catch((error) => {
    console.error('用户状态初始化失败:', error)
    app.mount('#app')
  })
}).catch((error) => {
  console.error('API配置加载失败:', error)
  const userStore = useUserStore()
  userStore.initialize().then(() => {
    app.mount('#app')
  }).catch((error) => {
    console.error('用户状态初始化失败:', error)
    app.mount('#app')
  })
})
