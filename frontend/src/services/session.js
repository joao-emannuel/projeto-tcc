import { readonly, ref } from 'vue'

const USER_KEY = 'usuario'
const TOKEN_KEY = 'visionfade.sessionToken'

function readStorage(key) {
  try {
    return globalThis.localStorage?.getItem(key) ?? null
  } catch {
    return null
  }
}

function cleanUser(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !value.id) return null
  const { sessionToken, senha_hash, senha, ...user } = value
  return user
}

function readUser() {
  try {
    return cleanUser(JSON.parse(readStorage(USER_KEY)))
  } catch {
    return null
  }
}

const user = ref(readUser())
const token = ref(readStorage(TOKEN_KEY))

export const sessionUser = readonly(user)

export function getSessionUser() {
  return user.value
}

export function getSessionToken() {
  return token.value
}

export function isAdminUser(value) {
  return value?.ativo !== false
    && ['admin', 'administrador'].includes(String(value?.nivel_acesso || '').toLowerCase())
}

function persistUser() {
  try {
    if (user.value) globalThis.localStorage?.setItem(USER_KEY, JSON.stringify(user.value))
    else globalThis.localStorage?.removeItem(USER_KEY)
  } catch {
    // A sessão atual continua funcionando quando o navegador bloqueia o armazenamento.
  }
}

export function saveSession(login) {
  const nextUser = cleanUser(login)
  if (!nextUser || typeof login.sessionToken !== 'string' || !login.sessionToken.trim()) {
    throw new Error('Não foi possível iniciar a sessão. Faça login novamente.')
  }

  user.value = nextUser
  token.value = login.sessionToken
  persistUser()
  try {
    globalThis.localStorage?.setItem(TOKEN_KEY, token.value)
  } catch {
    // O token permanece somente em memória se o armazenamento não estiver disponível.
  }
}

export function updateSessionUser(value) {
  user.value = cleanUser(value)
  persistUser()
}

export function clearSession() {
  user.value = null
  token.value = null
  persistUser()
  try {
    globalThis.localStorage?.removeItem(TOKEN_KEY)
  } catch {
    // A sessão em memória já foi encerrada.
  }
}
