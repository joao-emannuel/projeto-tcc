import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { apiRequest } from '../services/api.js'
import { sessionUser, getSessionToken, updateSessionUser } from '../services/session.js'
import usePreferences from './usePreferences.js'

export default function useFirstLoginPassword() {
  const route = useRoute()
  const { preferences } = usePreferences()
  const novaSenha = ref('')
  const confirmarSenha = ref('')
  const errorMessage = ref('')
  const successMessage = ref('')
  const busy = ref(false)
  const dismissedUserId = ref(null)
  let successTimeout
  let disposed = false
  
  const isOpen = computed(() => Boolean(
    route.meta.requiresAuth && getSessionToken() && sessionUser.value?.troca_senha_pendente
    && dismissedUserId.value !== sessionUser.value.id
  ))
  
  watch([() => sessionUser.value?.id, getSessionToken], () => {
    novaSenha.value = ''
    confirmarSenha.value = ''
    errorMessage.value = ''
    successMessage.value = ''
    clearTimeout(successTimeout)
    busy.value = false
    dismissedUserId.value = null
  }, { flush: 'sync' })

  function isCurrentSession(userId, token) {
    return !disposed && Boolean(token) && getSessionToken() === token && sessionUser.value?.id === userId
  }
  
  async function dismiss() {
    if (busy.value || !isOpen.value) return
    const userId = sessionUser.value.id
    const token = getSessionToken()
    dismissedUserId.value = userId
    novaSenha.value = ''
    confirmarSenha.value = ''
    errorMessage.value = ''
    try {
      const data = await apiRequest('/conta/adiar-senha', { method: 'POST' })
      if (isCurrentSession(userId, token)) updateSessionUser(data.usuario)
    } catch {
      // Fechar é opcional: uma falha de conexão não deve prender o usuário no pop-up.
    }
  }
  
  async function savePassword() {
    if (busy.value || !isOpen.value) return
    errorMessage.value = ''
    if (novaSenha.value.length < 8) {
      errorMessage.value = 'Use pelo menos 8 caracteres na nova senha.'
      return
    }
    if (novaSenha.value !== confirmarSenha.value) {
      errorMessage.value = 'As senhas não coincidem.'
      return
    }
    const userId = sessionUser.value?.id
    const token = getSessionToken()
    busy.value = true
    try {
      const data = await apiRequest('/conta/senha', {
        method: 'POST', body: { novaSenha: novaSenha.value, confirmarSenha: confirmarSenha.value },
      })
      if (isCurrentSession(userId, token)) {
        updateSessionUser(data.usuario)
        novaSenha.value = ''
        confirmarSenha.value = ''
        if (preferences.notifications) {
          successMessage.value = 'Sua nova senha foi salva.'
          clearTimeout(successTimeout)
          successTimeout = setTimeout(() => { successMessage.value = '' }, 4000)
        }
      }
    } catch (error) {
      if (isCurrentSession(userId, token)) errorMessage.value = error.message
    } finally {
      if (isCurrentSession(userId, token)) busy.value = false
    }
  }
  
  onBeforeUnmount(() => {
    disposed = true
    clearTimeout(successTimeout)
  })

  return { isOpen, novaSenha, confirmarSenha, errorMessage, successMessage, busy, dismiss, savePassword }
}
