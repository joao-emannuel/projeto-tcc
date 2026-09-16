import assert from 'node:assert/strict'
import { test } from 'node:test'
import { apiRequest } from '../src/services/api.js'
import {
  clearSession, getSessionToken, getSessionUser, isAdminUser,
  saveSession, sessionUser, updateSessionUser,
} from '../src/services/session.js'

function mockStorage(context) {
  const values = new Map()
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: key => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, String(value)),
      removeItem: key => values.delete(key),
    },
  })
  clearSession()
  context.after(() => {
    clearSession()
    if (original) Object.defineProperty(globalThis, 'localStorage', original)
    else delete globalThis.localStorage
  })
  return values
}

test('login mantém o token separado do usuário e atualiza a referência da interface', context => {
  const values = mockStorage(context)
  saveSession({ id: 7, apelido: 'Teste', nivel_acesso: 'admin', sessionToken: 'token-de-teste', troca_senha_pendente: true })

  assert.equal(getSessionToken(), 'token-de-teste')
  assert.deepEqual(JSON.parse(values.get('usuario')), {
    id: 7, apelido: 'Teste', nivel_acesso: 'admin', troca_senha_pendente: true,
  })
  assert.equal(values.get('visionfade.sessionToken'), 'token-de-teste')
  assert.equal(sessionUser.value.apelido, 'Teste')

  updateSessionUser({ ...getSessionUser(), apelido: 'Atualizado', troca_senha_pendente: false })
  assert.equal(sessionUser.value.apelido, 'Atualizado')
  assert.equal(sessionUser.value.troca_senha_pendente, false)
  assert.equal(getSessionToken(), 'token-de-teste')

  clearSession()
  assert.equal(getSessionUser(), null)
  assert.equal(getSessionToken(), null)
  assert.equal(values.has('usuario'), false)
  assert.equal(values.has('visionfade.sessionToken'), false)
})

test('resposta de login sem token não inicia sessão e reconhece somente papéis administrativos', context => {
  mockStorage(context)
  assert.throws(() => saveSession({ id: 7, nivel_acesso: 'admin' }), /iniciar a sessão/)
  assert.equal(getSessionUser(), null)
  for (const role of ['admin', 'administrador', 'ADMIN']) assert.equal(isAdminUser({ nivel_acesso: role }), true)
  assert.equal(isAdminUser({ nivel_acesso: 'admin', ativo: false }), false)
  for (const role of [undefined, null, 'usuario', 'cliente', true, 1]) {
    assert.equal(isAdminUser({ nivel_acesso: role }), false)
  }
})

test('API inclui Bearer e preserva sessão ao receber erro sem falta de autenticação', async context => {
  mockStorage(context)
  saveSession({ id: 7, sessionToken: 'token-de-teste' })
  const fetchMock = context.mock.method(globalThis, 'fetch', async () =>
    new Response(JSON.stringify({ erro: 'Somente administradores.' }), { status: 403 })
  )
  await assert.rejects(apiRequest('/usuarios'), { status: 403, message: 'Somente administradores.' })
  assert.equal(fetchMock.mock.calls[0].arguments[1].headers.Authorization, 'Bearer token-de-teste')
  assert.equal(getSessionToken(), 'token-de-teste')
})

test('401 encerra a sessão expirada mesmo quando a resposta não é JSON', async context => {
  const values = mockStorage(context)
  saveSession({ id: 7, sessionToken: 'token-expirado' })
  context.mock.method(globalThis, 'fetch', async () => new Response('Unauthorized', { status: 401 }))
  await assert.rejects(apiRequest('/conta'), { status: 401 })
  assert.equal(getSessionUser(), null)
  assert.equal(getSessionToken(), null)
  assert.equal(values.has('visionfade.sessionToken'), false)
})

test('falha atrasada de uma sessão antiga não encerra um login mais recente', async context => {
  mockStorage(context)
  saveSession({ id: 7, sessionToken: 'token-antigo' })
  let finishRequest
  context.mock.method(globalThis, 'fetch', () => new Promise(resolve => { finishRequest = resolve }))
  const pending = apiRequest('/conta')
  saveSession({ id: 8, sessionToken: 'token-novo' })
  finishRequest(new Response(JSON.stringify({ erro: 'Sessão expirada.' }), { status: 401 }))
  await assert.rejects(pending, { status: 401 })
  assert.equal(getSessionToken(), 'token-novo')
  assert.equal(getSessionUser().id, 8)
})

test('login sem sessão não envia Authorization nem exige dados salvos no navegador', async context => {
  mockStorage(context)
  const fetchMock = context.mock.method(globalThis, 'fetch', async () =>
    new Response(JSON.stringify({ erro: 'Usuário ou senha incorretos.' }), { status: 401 })
  )
  await assert.rejects(apiRequest('/login', { method: 'POST', body: {} }), { status: 401 })
  assert.equal(fetchMock.mock.calls[0].arguments[1].headers.Authorization, undefined)
  assert.equal(getSessionUser(), null)
})
