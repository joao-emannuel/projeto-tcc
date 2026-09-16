import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiRequest } from '../services/api.js'
import { clearSession, getSessionToken, isAdminUser, sessionUser } from '../services/session.js'

const isOpen = ref(true)

export default function useSidebar() {
  const router = useRouter()
  const route = useRoute()

  const isHomeActive = computed(() => route.name === 'home')
  const isSettingsActive = computed(() => route.name === 'configuracoes')
  const isAdminActive = computed(() => route.name === 'administrador')
  const isAdministrator = computed(() => isAdminUser(sessionUser.value))

  function navigateTo(name) {
    if (route.name === name) return

    const destination = { name }
    return ['customizar', 'resultadofinal'].includes(route.name)
      ? router.replace(destination)
      : router.push(destination)
  }

  function onHomeClick() {
    return navigateTo('home')
  }

  function onSettingsClick() {
    return navigateTo('configuracoes')
  }

  function onAdminClick() {
    return navigateTo('administrador')
  }

  const estaLogado = computed(() => sessionUser.value !== null)

  const apelidoExibido = computed(() =>
    estaLogado.value ? sessionUser.value.apelido || sessionUser.value.nome : 'Sem Cadastro'
  )

  const textoBoasVindas = computed(() =>
    estaLogado.value ? `Bem vindo, ${apelidoExibido.value}` : 'Sem Registro'
  )

  function onToggleSidebarClick() {
    isOpen.value = !isOpen.value
  }

  async function onLogoutClick() {
    const loggingOutToken = getSessionToken()
    try {
      if (loggingOutToken) await apiRequest('/logout', { method: 'POST' })
    } catch {
      // Mesmo sem conexão, sair deve encerrar a sessão neste navegador.
    } finally {
      if (getSessionToken() === loggingOutToken || !getSessionToken()) {
        clearSession()
        await router.replace({ name: 'login' })
      }
    }
  }

  return {
    isOpen, onToggleSidebarClick, estaLogado, apelidoExibido, textoBoasVindas, onLogoutClick,
    isHomeActive, isSettingsActive, onHomeClick, onSettingsClick,
    isAdminActive, isAdministrator, onAdminClick,
  }
}
