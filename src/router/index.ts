import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      redirect: '/vault'
    },
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/pages/LoginPage.vue'),
      meta: { title: '登录', guest: true }
    },
    {
      path: '/vault',
      name: 'Vault',
      component: () => import('@/pages/VaultPage.vue'),
      meta: { title: '档案', icon: '📂', requiresAuth: true }
    },
    {
      path: '/calendar',
      name: 'Calendar',
      component: () => import('@/pages/CalendarPage.vue'),
      meta: { title: '日历', icon: '📅', requiresAuth: true }
    },
    {
      path: '/profile',
      name: 'Profile',
      component: () => import('@/pages/ProfilePage.vue'),
      meta: { title: '我的', icon: '👤', requiresAuth: true }
    }
  ]
})

export default router
