import { onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiRequest } from '@/services/api.js'

export default function useResetPassword() {
  const route = useRoute()
  const router = useRouter()

  const token = route.query.token || ''

  const novaSenha = ref('')
  const confirmarSenha = ref('')
  const errorMessage = ref('')
  const successMessage = ref('')

  let messageTimeoutId = null

  function showError(message) {
    errorMessage.value = message
    successMessage.value = ''
    clearTimeout(messageTimeoutId)
    messageTimeoutId = setTimeout(() => {
      errorMessage.value = ''
    }, 3000)
  }

  onUnmounted(() => clearTimeout(messageTimeoutId))

  async function onConfirmClick() {
    if (novaSenha.value === '' || confirmarSenha.value === '') {
      showError('Preencha os dois campos.')
      return
    }

    if (novaSenha.value !== confirmarSenha.value) {
      showError('As senhas não coincidem.')
      return
    }

    if (!token) {
      showError('Link inválido ou expirado.')
      return
    }

    clearTimeout(messageTimeoutId)
    errorMessage.value = ''
    successMessage.value = ''

    try {
      const data = await apiRequest('/redefinir-senha', {
        method: 'POST',
        body: { token, novaSenha: novaSenha.value }
      })

      successMessage.value = data.mensagem
    } catch (error) {
      showError(error.message)
    }
  }

  function onBackToLoginClick() {
    router.push('/')
  }

  return { novaSenha, confirmarSenha, errorMessage, successMessage, onConfirmClick, onBackToLoginClick }
}
