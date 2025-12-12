import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../stores/user'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // 首页
    { path: '/', name: 'home', component: () => import('../views/HomeView.vue') },

    // 用户认证
    { path: '/login', name: 'login', component: () => import('../views/LoginView.vue') },
    { path: '/register', name: 'register', component: () => import('../views/RegisterView.vue') },

    // 聊天功能
    { 
      path: '/chat', 
      name: 'chat', 
      component: () => import('../views/ChatView.vue'),
      meta: { requiresAuth: true }
    },

    // 行程管理
    {
      path: '/trips/create',
      name: 'trip-create',
      component: () => import('../views/TripCreateView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/trips/:id',
      name: 'trip-detail',
      component: () => import('../views/TripDetailView.vue'),
      meta: { requiresAuth: true }
    },

    // 预算管理
    {
      path: '/trips/:id/budget',
      name: 'trip-budget',
      component: () => import('../views/BudgetView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/trips/:id/budget/add',
      name: 'expense-add',
      component: () => import('../views/TripCreateView.vue'),
      meta: { requiresAuth: true }
    },

    // 用户中心
    { 
      path: '/user', 
      name: 'user-center', 
      component: () => import('../views/UserCenterView.vue'),
      meta: { requiresAuth: true }
    },

    // 404页面
    { path: '/:pathMatch(.*)*', name: 'not-found', redirect: '/' },
  ],
})

// 路由守卫
router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore()
  
  // 如果路由需要认证
  if (to.meta.requiresAuth) {
    // 检查用户是否已登录
    if (userStore.isAuthenticated) {
      next()
    } else {
      // 尝试从localStorage获取token并初始化用户状态
      if (localStorage.getItem('token')) {
        try {
          await userStore.initialize()
          if (userStore.isAuthenticated) {
            next()
          } else {
            next('/login')
          }
        } catch (error) {
          console.error('用户初始化失败:', error)
          next('/login')
        }
      } else {
        next('/login')
      }
    }
  } else {
    // 不需要认证的路由直接放行
    next()
  }
})

export default router
