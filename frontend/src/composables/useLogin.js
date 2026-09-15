import { onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { apiRequest } from '@/services/api.js'

export default function useLogin() {
  const router = useRouter()

  const usernameOrEmail = ref('')
  const password = ref('')
  const errorMessage = ref('')

  let errorTimeoutId = null

  function showError(message) {
    errorMessage.value = message
    clearTimeout(errorTimeoutId)
    errorTimeoutId = setTimeout(() => {
      errorMessage.value = ''
    }, 3000)
  }

  onUnmounted(() => clearTimeout(errorTimeoutId))

  async function onLoginClick() {
    if (usernameOrEmail.value === '' || password.value === '') {
      showError('Preencha o usuário ou e-mail e a senha.')
      return
    }

    clearTimeout(errorTimeoutId)
    errorMessage.value = ''

    try {
      const data = await apiRequest('/login', {
        method: 'POST',
        body: {
          usernameOrEmail: usernameOrEmail.value,
          senha: password.value
        },
        fallbackMessage: 'Não foi possível fazer login.'
      })

      localStorage.setItem('usuario', JSON.stringify(data))
      router.push('/inicio')
    } catch (error) {
      showError(error.message)
    }
  }

  function onForgotPasswordClick() {
    router.push('/esqueci-senha')
  }

  return { usernameOrEmail, password, errorMessage, onLoginClick, onForgotPasswordClick }
}
