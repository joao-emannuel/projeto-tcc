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

    fetch('http://localhost:3000/api/esqueci-senha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value })
    })
      .then(response => response.json().then(data => ({ status: response.status, data })))
      .then(({ status, data }) => {
        if (status !== 200) {
          errorMessage.value = data.erro
          clearTimeout(messageTimeoutId)
          messageTimeoutId = setTimeout(() => {
            errorMessage.value = ''
          }, 3000)
          return
        }

        successMessage.value = data.mensagem
        clearTimeout(messageTimeoutId)
        messageTimeoutId = setTimeout(() => {
          successMessage.value = ''
        }, 3000)
      })
      .catch(err => {
        console.error(err)
        errorMessage.value = 'Não foi possível conectar ao servidor.'
        clearTimeout(messageTimeoutId)
        messageTimeoutId = setTimeout(() => {
          errorMessage.value = ''
        }, 3000)
      })
  }

  function onBackToLoginClick() {
    router.push('/')
  }

  return { email, errorMessage, successMessage, onSendClick, onBackToLoginClick }
}