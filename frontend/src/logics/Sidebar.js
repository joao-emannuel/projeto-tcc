import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

const isOpen = ref(true)

export default function SidebarLogic() {
  const router = useRouter()

  const usuarioSalvo = computed(() => {
    const dados = localStorage.getItem('usuario')
    return dados ? JSON.parse(dados) : null
  })

  const estaLogado = computed(() => usuarioSalvo.value !== null)

  const apelidoExibido = computed(() =>
    estaLogado.value ? usuarioSalvo.value.apelido : 'Sem Cadastro'
  )

  function onToggleSidebarClick() {
    isOpen.value = !isOpen.value
    console.log('Sidebar aberta?', isOpen.value)
  }

  function onLogoutClick() {
    localStorage.removeItem('usuario')
    router.push('/')
  }

  return { isOpen, onToggleSidebarClick, estaLogado, apelidoExibido, onLogoutClick }
}