import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/Login.vue'
import ForgotPasswordView from '../views/ForgotPassword.vue'
import HomeView from '../views/Home.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'login',
      component: LoginView,
    },
    {
      path: '/esqueci-senha',
      name: 'forgot-password',
      component: ForgotPasswordView,
    },
    {
      path: '/inicio',
      name: 'home',
      component: HomeView
    }
  ],
})

export default router