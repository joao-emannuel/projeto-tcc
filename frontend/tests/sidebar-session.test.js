import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createRenderer } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import useSidebar from '../src/composables/useSidebar.js'
import { clearSession, getSessionToken, saveSession, sessionUser } from '../src/services/session.js'

async function mountSidebar(context) {
  saveSession({ id: 7, nivel_acesso: 'admin', sessionToken: 'first-session' })
  const component = { render: () => null }
  const router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/', name: 'login', component },
    { path: '/inicio', name: 'home', component },
    { path: '/galeria', name: 'galeria', component },
    { path: '/customizar', name: 'customizar', component },
  ] })
  const renderer = createRenderer({ createComment: () => ({}), insert() {}, remove() {}, parentNode: () => null, nextSibling: () => null })
  let sidebar
  const app = renderer.createApp({ setup() { sidebar = useSidebar(); return () => null } })
  app.use(router)
  await router.push('/inicio')
  app.mount({})
  context.after(() => { app.unmount(); clearSession() })
  return { sidebar, router }
}

test('logout encerra sessão local mesmo quando a API falha', async context => {
  const request = context.mock.method(globalThis, 'fetch', async () => { throw new Error('offline') })
  const { sidebar, router } = await mountSidebar(context)
  await sidebar.onLogoutClick()
  assert.match(request.mock.calls[0].arguments[0], /\/logout$/)
  assert.equal(sessionUser.value, null)
  assert.equal(getSessionToken(), null)
  assert.equal(router.currentRoute.value.name, 'login')
})

test('logout atrasado da sessão anterior não encerra o login novo', async context => {
  let finish
  context.mock.method(globalThis, 'fetch', () => new Promise(resolve => { finish = resolve }))
  const { sidebar, router } = await mountSidebar(context)
  const pending = sidebar.onLogoutClick()
  saveSession({ id: 7, nivel_acesso: 'usuario', sessionToken: 'new-session' })
  finish(new Response(null, { status: 204 }))
  await pending
  assert.equal(getSessionToken(), 'new-session')
  assert.equal(router.currentRoute.value.name, 'home')
  assert.equal(sidebar.isAdministrator.value, false)
})

test('botão Galeria navega e marca a rota ativa no sidebar', async context => {
  const { sidebar, router } = await mountSidebar(context)
  assert.equal(sidebar.isGalleryActive.value, false)
  await sidebar.onGalleryClick()
  assert.equal(router.currentRoute.value.name, 'galeria')
  assert.equal(sidebar.isGalleryActive.value, true)
  assert.equal(sidebar.isHomeActive.value, false)
  const push = context.mock.method(router, 'push')
  await sidebar.onGalleryClick()
  assert.equal(push.mock.callCount(), 0)
})

test('abrir Galeria ao sair de customizar substitui a etapa no histórico', async context => {
  const { sidebar, router } = await mountSidebar(context)
  await router.push({ name: 'customizar' })
  const replace = context.mock.method(router, 'replace')
  await sidebar.onGalleryClick()
  assert.equal(replace.mock.callCount(), 1)
  assert.equal(router.currentRoute.value.name, 'galeria')
})
