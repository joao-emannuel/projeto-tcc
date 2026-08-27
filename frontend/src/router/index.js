import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/Login.vue'
import ForgotPasswordView from '../views/ForgotPassword.vue'
import ResetPasswordView from '@/views/ResetPassword.vue'
import HomeView from '../views/Home.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'login',
      component: LoginView,
      meta: { guestOnly: true }
    },
    {
      path: '/esqueci-senha',
      name: 'forgot-password',
      component: ForgotPasswordView,
    },
    {
      path: '/redefinir-senha',
      name: 'reset-password',
      component: ResetPasswordView,
    },
    {
      path: '/inicio',
      name: 'home',
      component: HomeView,
      meta: { requiresAuth: true }
    }
  ],
})

router.beforeEach((to, from, next) => {
  const usuarioLogado = localStorage.getItem('usuario')

  if (to.meta.requiresAuth && !usuarioLogado) {
    // rota protegida, mas ninguém logado → manda pro login
    next({ name: 'login' })
  } else if (to.meta.guestOnly && usuarioLogado) {
    // rota só pra visitante (login), mas já tem alguém logado → manda pro início
    next({ name: 'home' })
  } else {
    next()
  }
})

export default router