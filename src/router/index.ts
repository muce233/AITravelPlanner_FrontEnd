import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // 首页
    { path: '/', name: 'home', component: () => import('../views/HomeView.vue') },

    // 用户认证
    { path: '/login', name: 'login', component: () => import('../views/LoginView.vue') },
    { path: '/register', name: 'register', component: () => import('../views/RegisterView.vue') },

    // 聊天功能
    { path: '/chat', name: 'chat', component: () => import('../views/ChatView.vue') },

    // 行程管理
    {
      path: '/trips/create',
      name: 'trip-create',
      component: () => import('../views/TripCreateView.vue'),
    },
    {
      path: '/trips/:id',
      name: 'trip-detail',
      component: () => import('../views/TripDetailView.vue'),
    },

    // 预算管理
    {
      path: '/trips/:id/budget',
      name: 'trip-budget',
      component: () => import('../views/BudgetView.vue'),
    },
    {
      path: '/trips/:id/budget/add',
      name: 'expense-add',
      component: () => import('../views/TripCreateView.vue'),
    },

    // 用户中心
    { path: '/user', name: 'user-center', component: () => import('../views/UserCenterView.vue') },

    // 404页面
    { path: '/:pathMatch(.*)*', name: 'not-found', redirect: '/' },
  ],
})

export default router
