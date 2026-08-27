import { ref } from 'vue'
import { useRouter } from 'vue-router'

export default function LoginLogic() {
  const router = useRouter()

  const usernameOrEmail = ref('')
  const password = ref('')
  const errorMessage = ref('')
  const showForgotPassword = ref(false)
  const loading = ref(false)

  let errorTimeoutId = null

  function onLoginClick() {
    if (usernameOrEmail.value === '' || password.value === '') { // checa se as textboxes de nome/email e senha estão vazias
      console.log('Parâmetros inválidos.')

      errorMessage.value = 'Parâmetros inválidos.'
      clearTimeout(errorTimeoutId)
      errorTimeoutId = setTimeout(() => {
        errorMessage.value = ''
      }, 3000) // 3000ms = 3 segundos

    } else {
      console.log('Login:', { usernameOrEmail: usernameOrEmail.value, password: password.value })

      // lógica de login do banco de dados aqui

      fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usernameOrEmail: usernameOrEmail.value,
          senha: password.value
        })
      })
        .then(response => response.json().then(data => ({ status: response.status, data })))
        .then(({ status, data }) => {
          if (status !== 200) {
            errorMessage.value = data.erro
            clearTimeout(errorTimeoutId)
            errorTimeoutId = setTimeout(() => {
              errorMessage.value = ''
            }, 3000)
            return
          }

          console.log('Login bem-sucedido:', data)
          localStorage.setItem('usuario', JSON.stringify(data))
          router.push('/inicio')
        })
        .catch(err => {
          console.error(err)
        })
    }
  }

  function onForgotPasswordClick() {
    console.log('Esqueci minha senha clicado')

    // lógica da recuperação de senha aqui
    router.push('/esqueci-senha')
  }

  return { usernameOrEmail, password, errorMessage, showForgotPassword, onLoginClick, onForgotPasswordClick }
}