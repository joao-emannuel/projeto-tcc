import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { adminUsersApi } from '../services/adminUsers.js'
import { getSessionUser, updateSessionUser } from '../services/session.js'

const emptyUser = () => ({ nome: '', apelido: '', telefone: '', email: '', nivel_acesso: 'usuario' })
const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')
const normalizeUser = user => ({ ...user, nivel_acesso: user.nivel_acesso === 'administrador' ? 'admin' : user.nivel_acesso })

export default function useAdminUsers({ api = adminUsersApi, currentUser = getSessionUser() } = {}) {
  const users = ref([])
  const search = ref('')
  const statusFilter = ref('all')
  const roleFilter = ref('all')
  const loading = ref(false)
  const busy = ref(false)
  const error = ref('')
  const formError = ref('')
  const modalError = ref('')
  const success = ref('')
  const accessDenied = ref(false)
  const form = reactive(emptyUser())
  const pendingRegistration = ref(null)
  const code = ref('')
  const cooldowns = reactive(new Map())
  const clock = ref(Date.now())
  const verificationBlocked = ref(false)
  const attemptsRemaining = ref(null)
  const editing = ref(null)
  const confirmation = ref(null)
  let resendTimer

  const emailKey = email => String(email || '').trim().toLowerCase()
  const cooldownSeconds = email => Math.max(0, Math.ceil(((cooldowns.get(emailKey(email)) || 0) - clock.value) / 1000))
  const createSeconds = computed(() => cooldownSeconds(form.email))
  const resendSeconds = computed(() => cooldownSeconds(pendingRegistration.value?.email))

  const filteredUsers = computed(() => {
    const term = normalize(search.value.trim())
    return users.value.filter(user => {
      const matchesText = !term || [user.nome, user.apelido, user.email].some(value => normalize(value).includes(term))
      return matchesText
        && (statusFilter.value === 'all' || (user.ativo ? 'active' : 'inactive') === statusFilter.value)
        && (roleFilter.value === 'all' || user.nivel_acesso === roleFilter.value)
    })
  })
  const totalActive = computed(() => users.value.filter(user => user.ativo).length)
  const totalAdmins = computed(() => users.value.filter(user => user.nivel_acesso === 'admin').length)
  const isSelf = user => String(user.id) === String(currentUser?.id)

  function captureError(cause, target) {
    target.value = cause.message || 'Não foi possível concluir a solicitação.'
    if ([401, 403].includes(cause.status)) accessDenied.value = true
  }

  function updateListedUser(user) {
    user = normalizeUser(user)
    const index = users.value.findIndex(item => item.id === user.id)
    if (index < 0) users.value.unshift(user)
    else users.value.splice(index, 1, user)
    const sessionUser = getSessionUser()
    if (String(sessionUser?.id) === String(user.id)) updateSessionUser({ ...sessionUser, ...user })
  }

  async function loadUsers() {
    if (loading.value) return
    loading.value = true
    error.value = ''
    try {
      users.value = (await api.list()).map(normalizeUser)
      accessDenied.value = false
    } catch (cause) { captureError(cause, error) }
    finally { loading.value = false }
  }

  function startResendCooldown(email, metadata = {}, fallbackSeconds = 0) {
    const now = Date.now()
    const date = Date.parse(metadata.reenviarEm)
    const seconds = Number(metadata.retryAfterSeconds) || (Number.isFinite(date) ? 0 : fallbackSeconds)
    const until = Math.max(Number.isFinite(date) ? date : 0, seconds > 0 ? now + seconds * 1000 : 0)
    if (until <= now) return
    cooldowns.set(emailKey(email), Math.max(cooldowns.get(emailKey(email)) || 0, until))
    clock.value = now
    clearInterval(resendTimer)
    resendTimer = setInterval(() => {
      clock.value = Date.now()
      for (const [key, deadline] of cooldowns) {
        if (deadline <= clock.value) cooldowns.delete(key)
      }
      if (!cooldowns.size) clearInterval(resendTimer)
    }, 1000)
  }

  async function createAccount() {
    if (busy.value || accessDenied.value || createSeconds.value) return
    busy.value = true
    formError.value = ''
    success.value = ''
    try {
      pendingRegistration.value = await api.requestRegistration({
        ...form, nome: form.nome.trim(), apelido: form.apelido.trim(),
        email: form.email.trim(), telefone: form.telefone.trim(),
      })
      code.value = ''
      modalError.value = ''
      verificationBlocked.value = false
      attemptsRemaining.value = null
      startResendCooldown(pendingRegistration.value.email, pendingRegistration.value, 30)
    } catch (cause) {
      captureError(cause, formError)
      startResendCooldown(form.email, cause)
    }
    finally { busy.value = false }
  }

  function closeVerification() {
    if (busy.value) return
    pendingRegistration.value = null
    code.value = ''
    modalError.value = ''
    verificationBlocked.value = false
    attemptsRemaining.value = null
  }

  async function resendCode() {
    if (busy.value || resendSeconds.value || !pendingRegistration.value || accessDenied.value) return
    busy.value = true
    modalError.value = ''
    try {
      pendingRegistration.value = await api.resendCode(pendingRegistration.value.cadastroId)
      code.value = ''
      verificationBlocked.value = false
      attemptsRemaining.value = null
      startResendCooldown(pendingRegistration.value.email, pendingRegistration.value, 30)
    } catch (cause) {
      captureError(cause, modalError)
      startResendCooldown(pendingRegistration.value.email, cause)
    }
    finally { busy.value = false }
  }

  async function verifyCode() {
    if (busy.value || !pendingRegistration.value || accessDenied.value || verificationBlocked.value) return
    modalError.value = ''
    const value = code.value.trim()
    if (!/^\d{6}$/.test(value)) {
      modalError.value = 'Digite os 6 números do código recebido por e-mail.'
      return
    }
    busy.value = true
    try {
      const { usuario } = await api.confirmRegistration(pendingRegistration.value.cadastroId, value)
      updateListedUser(usuario)
      pendingRegistration.value = null
      Object.assign(form, emptyUser())
      code.value = ''
      success.value = `Conta de ${usuario.apelido || usuario.nome} criada. O usuário já pode entrar com a senha inicial recebida por e-mail.`
    } catch (cause) {
      captureError(cause, modalError)
      if (cause.codigoBloqueado) verificationBlocked.value = true
      if (Number.isInteger(cause.tentativasRestantes)) attemptsRemaining.value = cause.tentativasRestantes
    }
    finally { busy.value = false }
  }

  function openEdit(user) {
    if (busy.value || accessDenied.value) return
    modalError.value = ''
    editing.value = normalizeUser(user)
  }

  function closeEdit() {
    if (!busy.value) { editing.value = null; modalError.value = '' }
  }

  async function saveUser() {
    if (busy.value || !editing.value || accessDenied.value) return
    busy.value = true
    modalError.value = ''
    try {
      const user = editing.value
      const original = users.value.find(item => item.id === user.id)
      const { usuario } = await api.update(user.id, {
        nome: user.nome.trim(), apelido: user.apelido.trim(), telefone: (user.telefone || '').trim(),
        nivel_acesso: isSelf(user) ? original.nivel_acesso : user.nivel_acesso,
        ativo: isSelf(user) ? original.ativo : user.ativo,
      })
      updateListedUser(usuario)
      editing.value = null
      success.value = 'Dados do usuário atualizados.'
    } catch (cause) { captureError(cause, modalError) }
    finally { busy.value = false }
  }

  function askConfirmation(user) {
    if (busy.value || accessDenied.value || isSelf(user)) return
    confirmation.value = { user }
    modalError.value = ''
  }

  function closeConfirmation() {
    if (!busy.value) { confirmation.value = null; modalError.value = '' }
  }

  async function confirmAction() {
    if (busy.value || !confirmation.value || accessDenied.value) return
    const { user } = confirmation.value
    if (isSelf(user)) return
    busy.value = true
    modalError.value = ''
    try {
      const { usuario } = await api.update(user.id, { ativo: !user.ativo })
      updateListedUser(usuario)
      success.value = usuario.ativo ? 'Usuário reativado.' : 'Usuário desativado. Seus dados foram preservados.'
      confirmation.value = null
    } catch (cause) { captureError(cause, modalError) }
    finally { busy.value = false }
  }

  onMounted(loadUsers)
  onBeforeUnmount(() => clearInterval(resendTimer))

  return {
    users, search, statusFilter, roleFilter, filteredUsers, totalActive, totalAdmins, isSelf,
    loading, busy, error, formError, modalError, success, accessDenied, form, pendingRegistration,
    code, resendSeconds, createSeconds, verificationBlocked, attemptsRemaining, editing, confirmation, loadUsers, createAccount, closeVerification,
    resendCode, verifyCode, openEdit, closeEdit, saveUser, askConfirmation, closeConfirmation, confirmAction,
  }
}
