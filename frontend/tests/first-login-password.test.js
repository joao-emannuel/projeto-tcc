import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createRenderer, nextTick } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import useFirstLoginPassword from '../src/composables/useFirstLoginPassword.js'
import { clearSession, getSessionToken, saveSession, sessionUser } from '../src/services/session.js'
import { initPreferences } from '../src/composables/usePreferences.js'

const user = { id: 21, apelido: 'novo-usuario', ativo: true, nivel_acesso: 'usuario', troca_senha_pendente: true }

async function mountPassword(context, pending = true) {
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  const storage = new Map([['visionfade.preferences', JSON.stringify({ notifications: false })]])
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: key => storage.delete(key),
  } })
  initPreferences()
  saveSession({ ...user, troca_senha_pendente: pending, sessionToken: 'test-session' })
  const router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/', name: 'login', component: { render: () => null } },
    { path: '/inicio', name: 'home', meta: { requiresAuth: true }, component: { render: () => null } },
    { path: '/configuracoes', name: 'configuracoes', meta: { requiresAuth: true }, component: { render: () => null } },
  ] })
  const renderer = createRenderer({ createComment: () => ({}), insert() {}, remove() {}, parentNode: () => null, nextSibling: () => null })
  let password
  const app = renderer.createApp({ setup() { password = useFirstLoginPassword(); return () => null } })
  app.use(router)
  await router.push('/inicio')
  app.mount({})
  context.after(() => {
    app.unmount()
    clearSession()
    if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage)
    else delete globalThis.localStorage
  })
  return { password, router }
}

test('pop-up aparece para o usuário com primeiro acesso pendente somente depois do login', async context => {
  const { password, router } = await mountPassword(context)
  assert.equal(password.isOpen.value, true)
  await router.push('/')
  assert.equal(password.isOpen.value, false)
  await router.push('/inicio')
  clearSession()
  await nextTick()
  assert.equal(password.isOpen.value, false)
})

test('contas sem troca pendente não exibem pop-up', async context => {
  const { password } = await mountPassword(context, false)
  assert.equal(password.isOpen.value, false)
})

test('fechar reconhece o primeiro acesso sem alterar senha e não reabre ao navegar', async context => {
  const request = context.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({
    usuario: { ...user, troca_senha_pendente: false }, mensagem: 'Continuar',
  })))
  const { password, router } = await mountPassword(context)
  await password.dismiss()
  assert.match(request.mock.calls[0].arguments[0], /\/conta\/adiar-senha$/)
  assert.equal(request.mock.calls[0].arguments[1].body, undefined)
  assert.equal(password.isOpen.value, false)
  await router.push('/configuracoes')
  assert.equal(password.isOpen.value, false)
  assert.equal(sessionUser.value.troca_senha_pendente, false)
})

test('falha de rede ao fechar mantém o pop-up fechado nesta sessão', async context => {
  context.mock.method(globalThis, 'fetch', async () => { throw new Error('offline') })
  const { password, router } = await mountPassword(context)
  await password.dismiss()
  await router.push('/configuracoes')
  assert.equal(password.isOpen.value, false)
})

test('valida confirmação e salva nova senha apenas uma vez durante a requisição', async context => {
  let finish
  const request = context.mock.method(globalThis, 'fetch', () => new Promise(resolve => { finish = resolve }))
  const { password } = await mountPassword(context)
  password.novaSenha.value = 'senha-nova-teste'
  password.confirmarSenha.value = 'diferente'
  await password.savePassword()
  assert.equal(request.mock.callCount(), 0)
  assert.match(password.errorMessage.value, /não coincidem/)
  password.confirmarSenha.value = password.novaSenha.value
  const pending = password.savePassword()
  await password.savePassword()
  assert.equal(request.mock.callCount(), 1)
  const [url, options] = request.mock.calls[0].arguments
  assert.match(url, /\/conta\/senha$/)
  assert.equal(options.headers.Authorization, 'Bearer test-session')
  assert.deepEqual(JSON.parse(options.body), { novaSenha: 'senha-nova-teste', confirmarSenha: 'senha-nova-teste' })
  finish(new Response(JSON.stringify({ usuario: { ...user, troca_senha_pendente: false } })))
  await pending
  assert.equal(password.isOpen.value, false)
  assert.equal(password.novaSenha.value, '')
})

test('fechamento atrasado não altera uma nova sessão do mesmo usuário', async context => {
  let finish
  context.mock.method(globalThis, 'fetch', () => new Promise(resolve => { finish = resolve }))
  const { password } = await mountPassword(context)
  const pending = password.dismiss()
  assert.equal(password.isOpen.value, false)
  saveSession({ ...user, sessionToken: 'another-session' })
  assert.equal(password.isOpen.value, true)
  finish(new Response(JSON.stringify({ usuario: { ...user, troca_senha_pendente: false } })))
  await pending
  assert.equal(getSessionToken(), 'another-session')
  assert.equal(sessionUser.value.troca_senha_pendente, true)
  assert.equal(password.isOpen.value, true)
})

test('resposta de senha atrasada não limpa os campos ou altera o usuário do login novo', async context => {
  let finish
  context.mock.method(globalThis, 'fetch', () => new Promise(resolve => { finish = resolve }))
  const { password } = await mountPassword(context)
  password.novaSenha.value = 'senha-nova-teste'
  password.confirmarSenha.value = 'senha-nova-teste'
  const pending = password.savePassword()
  saveSession({ ...user, sessionToken: 'another-session' })
  assert.equal(password.busy.value, false)
  password.novaSenha.value = 'nova-tentativa'
  finish(new Response(JSON.stringify({ usuario: { ...user, troca_senha_pendente: false } })))
  await pending
  assert.equal(sessionUser.value.troca_senha_pendente, true)
  assert.equal(password.novaSenha.value, 'nova-tentativa')
})

test('erro de senha atrasado não aparece no novo login', async context => {
  let finish
  context.mock.method(globalThis, 'fetch', () => new Promise(resolve => { finish = resolve }))
  const { password } = await mountPassword(context)
  password.novaSenha.value = 'senha-nova-teste'
  password.confirmarSenha.value = 'senha-nova-teste'
  const pending = password.savePassword()
  clearSession()
  saveSession({ ...user, sessionToken: 'another-session' })
  finish(new Response(JSON.stringify({ erro: 'Sessão antiga expirou.' }), { status: 401 }))
  await pending
  assert.equal(password.errorMessage.value, '')
  assert.equal(getSessionToken(), 'another-session')
  assert.equal(password.isOpen.value, true)
})
