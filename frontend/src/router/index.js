import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/Login.vue'
import ForgotPasswordView from '../views/ForgotPassword.vue'
import ResetPasswordView from '@/views/ResetPassword.vue'
import HomeView from '../views/Home.vue'
import CustomizarView from '@/views/Customizar.vue'
import ResultadoFinalView from '@/views/ResultadoFinal.vue'
import ConfiguracoesView from '@/views/Configuracoes.vue'
import AdministradorView from '@/views/Administrador.vue'
import { createRouteGuard } from './routeGuard.js'

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
    },
    {
      path: '/customizar',
      name: 'customizar',
      component: CustomizarView,
      meta: { requiresAuth: true }
    },
    {
      path: '/resultadofinal',
      name: 'resultadofinal',
      component: ResultadoFinalView,
      meta: { requiresAuth: true }
    },
    {
      path: '/configuracoes',
      name: 'configuracoes',
      component: ConfiguracoesView,
      meta: { requiresAuth: true }
    },
    {
      path: '/administrador',
      name: 'administrador',
      component: AdministradorView,
      meta: { requiresAuth: true, requiresAdmin: true }
    }
  ],
})

router.beforeEach(createRouteGuard())

export default router
