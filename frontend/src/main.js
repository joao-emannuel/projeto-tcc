import './assets/main.css'

import { createApp, watch } from 'vue'
import App from './App.vue'
import router from './router'
import { initPreferences } from './composables/usePreferences.js'
import { customizationFlow } from './services/customizationFlow.js'
import { apiRequest } from './services/api.js'
import { clearSession, getSessionToken, isAdminUser, sessionUser, updateSessionUser } from './services/session.js'

initPreferences()

async function startApp() {
  if (!getSessionToken()) clearSession()
  else {
    try {
      updateSessionUser(await apiRequest('/conta', { signal: AbortSignal.timeout(8000) }))
    } catch {
      clearSession()
    }
  }

  const app = createApp(App)
  app.use(router)
  watch(sessionUser, user => {
    if (!user && router.currentRoute.value.meta.requiresAuth) router.replace({ name: 'login' })
    else if (router.currentRoute.value.meta.requiresAdmin && !isAdminUser(user)) router.replace({ name: 'home' })
  })
  app.mount('#app')
}

window.addEventListener('pageshow', event => {
  if (!event.persisted) return

  // O navegador pode restaurar a página inteira sem executar os guards novamente.
  customizationFlow.reset()
  if (['customizar', 'resultadofinal'].includes(router.currentRoute.value.name)) {
    router.replace({ name: 'home' })
  }
})

startApp()
