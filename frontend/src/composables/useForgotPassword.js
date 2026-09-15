import { onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { apiRequest } from '@/services/api.js'

export default function useForgotPassword() {
  const router = useRouter()

  const email = ref('')
  const errorMessage = ref('')
  const successMessage = ref('')

  let messageTimeoutId = null

  onUnmounted(() => clearTimeout(messageTimeoutId))

  async function onSendClick() {
    clearTimeout(messageTimeoutId)
    errorMessage.value = ''
    successMessage.value = ''

    if (email.value === '') {
      errorMessage.value = 'Preencha o campo de e-mail.'
      messageTimeoutId = setTimeout(() => {
        errorMessage.value = ''
      }, 3000)
      return
    }

    try {
      const data = await apiRequest('/esqueci-senha', {
        method: 'POST',
        body: { email: email.value }
      })

      successMessage.value = data.mensagem
    } catch (error) {
      errorMessage.value = error.message
    }

    clearTimeout(messageTimeoutId)
    messageTimeoutId = setTimeout(() => {
      errorMessage.value = ''
      successMessage.value = ''
    }, 3000)
  }

  function onBackToLoginClick() {
    router.push('/')
  }

  return { email, errorMessage, successMessage, onSendClick, onBackToLoginClick }
}
