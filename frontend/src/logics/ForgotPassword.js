import { ref } from 'vue'
import { useRouter } from 'vue-router'

export default function ForgotPasswordLogic() {
  const router = useRouter()

  const email = ref('')
  const errorMessage = ref('')
  const successMessage = ref('')

  let messageTimeoutId = null

  function onSendClick() {
    if (email.value === '') {
      errorMessage.value = 'Preencha o campo de e-mail.'
      successMessage.value = ''

      clearTimeout(messageTimeoutId)
      messageTimeoutId = setTimeout(() => {
        errorMessage.value = ''
      }, 3000)

      return
    }

    errorMessage.value = ''
    console.log('Recuperar senha para:', email.value)

    // lógica de recuperação de senha do banco de dados aqui

    

    successMessage.value = 'Se esse e-mail existir, enviamos um link.'
    clearTimeout(messageTimeoutId)
    messageTimeoutId = setTimeout(() => {
      successMessage.value = ''
    }, 3000)
  }

  function onBackToLoginClick() {
    router.push('/')
  }

  return { email, errorMessage, successMessage, onSendClick, onBackToLoginClick }
}