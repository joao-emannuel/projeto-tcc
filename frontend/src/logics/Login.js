import { ref } from 'vue'
import { useRouter } from 'vue-router'

export default function LoginLogic() {
  const router = useRouter()

  const usernameOrEmail = ref('')
  const password = ref('')
  const errorMessage = ref('')
  const showForgotPassword = ref(false)

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
    }

    // lógica de login do banco de dados aqui

  }

  function onForgotPasswordClick() {
    console.log('Esqueci minha senha clicado')

    // lógica da recuperação de senha aqui
    router.push('/esqueci-senha')
  }

  return { usernameOrEmail, password, errorMessage, showForgotPassword, onLoginClick, onForgotPasswordClick }
}