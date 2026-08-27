import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

export default function ResetPasswordLogic() {
  const route = useRoute()
  const router = useRouter()

  const token = route.query.token || ''

  const novaSenha = ref('')
  const confirmarSenha = ref('')
  const errorMessage = ref('')
  const successMessage = ref('')

  let messageTimeoutId = null

  function showError(msg) {
    errorMessage.value = msg
    successMessage.value = ''
    clearTimeout(messageTimeoutId)
    messageTimeoutId = setTimeout(() => {
      errorMessage.value = ''
    }, 3000)
  }

  function onConfirmClick() {
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

    errorMessage.value = ''

    fetch('http://localhost:3000/api/redefinir-senha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, novaSenha: novaSenha.value })
    })
      .then(response => response.json().then(data => ({ status: response.status, data })))
      .then(({ status, data }) => {
        if (status !== 200) {
          showError(data.erro)
          return
        }

        successMessage.value = data.mensagem
      })
      .catch(err => {
        console.error(err)
        showError('Não foi possível conectar ao servidor.')
      })
  }

  function onBackToLoginClick() {
    router.push('/')
  }

  return { novaSenha, confirmarSenha, errorMessage, successMessage, onConfirmClick, onBackToLoginClick }
}