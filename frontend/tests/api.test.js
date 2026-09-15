import assert from 'node:assert/strict'
import { test } from 'node:test'
import { apiRequest } from '../src/services/api.js'

test('envia JSON para a API e retorna os dados da resposta', async (context) => {
  const usuario = { id: 1, apelido: 'Teste' }
  const fetchMock = context.mock.method(globalThis, 'fetch', async () =>
    new Response(JSON.stringify(usuario), { status: 200 })
  )

  const result = await apiRequest('/login', {
    method: 'POST',
    body: { usernameOrEmail: 'teste', senha: 'senha-de-teste' }
  })

  assert.deepEqual(result, usuario)
  assert.equal(fetchMock.mock.calls.length, 1)
  const [url, options] = fetchMock.mock.calls[0].arguments
  assert.equal(url, 'http://localhost:3000/api/login')
  assert.equal(options.method, 'POST')
  assert.equal(options.headers['Content-Type'], 'application/json')
  assert.deepEqual(JSON.parse(options.body), {
    usernameOrEmail: 'teste',
    senha: 'senha-de-teste'
  })
})

test('preserva a mensagem de erro enviada pelo backend', async (context) => {
  context.mock.method(globalThis, 'fetch', async () =>
    new Response(JSON.stringify({ erro: 'Link inválido ou expirado.' }), { status: 400 })
  )

  await assert.rejects(apiRequest('/redefinir-senha'), {
    message: 'Link inválido ou expirado.'
  })
})

test('usa a mensagem padrão quando a falha HTTP não contém JSON', async (context) => {
  context.mock.method(globalThis, 'fetch', async () =>
    new Response('<h1>Erro interno</h1>', { status: 500 })
  )

  await assert.rejects(apiRequest('/login', {
    fallbackMessage: 'Não foi possível fazer login.'
  }), { message: 'Não foi possível fazer login.' })
})

test('transforma falhas de rede em uma mensagem para o usuário', async (context) => {
  context.mock.method(globalThis, 'fetch', async () => {
    throw new TypeError('Failed to fetch')
  })

  await assert.rejects(apiRequest('/login'), {
    message: 'Não foi possível conectar ao servidor.'
  })
})

test('identifica respostas de sucesso com JSON inválido', async (context) => {
  context.mock.method(globalThis, 'fetch', async () => new Response('invalid', { status: 200 }))

  await assert.rejects(apiRequest('/login'), {
    message: 'O servidor retornou uma resposta inválida.'
  })
})

test('aceita uma resposta sem conteúdo', async (context) => {
  context.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 204 }))

  assert.equal(await apiRequest('/exemplo'), null)
})
