import assert from 'node:assert/strict'
import { after, before, beforeEach, mock, test } from 'node:test'
import bcrypt from 'bcrypt'

// Impede qualquer leitura do .env, conexão com PostgreSQL ou envio real de e-mail.
const query = mock.fn()
const sendEmail = mock.fn()
mock.module('../src/database.js', { namedExports: { pool: { query } } })
mock.module('../src/config.js', {
  namedExports: {
    config: {
      frontendUrl: 'https://frontend.example.test',
      email: { apiKey: 'test-key', from: 'sender@example.test' },
    },
  },
})
mock.module('resend', {
  namedExports: { Resend: class { emails = { send: sendEmail } } },
})

const { default: app } = await import('../src/app.js')
const senha = 'senha-de-teste'
const usuario = { id: 1, nome: 'Ana', apelido: 'ana', email: 'ana@example.test', ativo: true }
const usuarioComSenha = { ...usuario, senha_hash: await bcrypt.hash(senha, 10) }
let server
let baseUrl

before(async () => {
  server = app.listen(0, '127.0.0.1')
  await new Promise((resolve, reject) => {
    server.once('listening', resolve)
    server.once('error', reject)
  })
  baseUrl = `http://127.0.0.1:${server.address().port}/api`
})

after(async () => {
  if (server) await new Promise((resolve, reject) => server.close(err => err ? reject(err) : resolve()))
  mock.restoreAll()
})

beforeEach(t => {
  query.mock.resetCalls()
  query.mock.mockImplementation(() => { throw new Error('Consulta inesperada no teste') })
  sendEmail.mock.resetCalls()
  sendEmail.mock.mockImplementation(async () => ({ data: { id: 'test-email' }, error: null }))
  t.mock.method(console, 'error', () => {})
})

function respondWith(...responses) {
  query.mock.mockImplementation(async () => {
    assert.ok(responses.length, 'Consulta inesperada no teste')
    const response = responses.shift()
    if (response instanceof Error) throw response
    return { rows: response }
  })
}

async function request(path, body) {
  const response = await fetch(`${baseUrl}${path}`, body === undefined ? {} : {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return { status: response.status, body: await response.json() }
}

const pngPhoto = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jA7sAAAAASUVORK5CYII=', 'base64')

async function uploadPhoto({ path = '/fotos?usuarioId=1&nome=retrato.png', tipoMime = 'image/png', conteudo = pngPhoto } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': tipoMime },
    body: conteudo,
  })
  return { status: response.status, body: await response.json() }
}

test('upload armazena os bytes PNG/JPEG e devolve apenas os metadados da foto', async () => {
  for (const [tipoMime, nome, conteudo] of [
    ['image/png', 'retrato com espaço.png', pngPhoto],
    ['image/jpeg', 'retrato.jpg', Buffer.from('ffd8ffe000104a46494600010100000100010000ffd9', 'hex')],
  ]) {
    const foto = {
      id: 7,
      usuario_id: 1,
      nome_original: nome,
      tipo_mime: tipoMime,
      tamanho_bytes: conteudo.length,
      criado_em: '2026-09-15T12:00:00.000Z',
    }
    respondWith([foto])
    assert.deepEqual(await uploadPhoto({ path: `/fotos?usuarioId=1&nome=${encodeURIComponent(nome)}`, tipoMime, conteudo }), {
      status: 201, body: foto,
    })
    const [sql, parameters] = query.mock.calls.at(-1).arguments
    assert.match(sql, /INSERT INTO fotos/)
    assert.doesNotMatch(sql.split('RETURNING')[1], /conteudo/)
    assert.deepEqual(parameters, [1, nome, tipoMime, conteudo.length, conteudo])
  }
})

test('upload rejeita usuário ou nome inválido antes de acessar o banco', async () => {
  for (const usuarioId of ['', '0', '-1', '1.2', 'abc', '2147483648', '1&usuarioId=2']) {
    assert.deepEqual(await uploadPhoto({ path: `/fotos?usuarioId=${usuarioId}&nome=retrato.png` }), {
      status: 400, body: { erro: 'Usuário inválido.' },
    })
  }
  for (const nome of ['', '%20%20', 'a.png&nome=b.png']) {
    assert.deepEqual(await uploadPhoto({ path: `/fotos?usuarioId=1&nome=${nome}` }), {
      status: 400, body: { erro: 'Informe o nome do arquivo.' },
    })
  }
  assert.equal(query.mock.callCount(), 0)
})

test('upload rejeita tipo, assinatura e arquivo vazio sem acessar o banco', async () => {
  for (const tipoMime of ['image/gif', 'application/json', 'constructor']) {
    assert.deepEqual(await uploadPhoto({ tipoMime }), {
      status: 415, body: { erro: 'Selecione uma foto JPG ou PNG.' },
    })
  }
  for (const [tipoMime, conteudo] of [
    ['image/png', Buffer.from('arquivo de texto')],
    ['image/jpeg', pngPhoto],
    ['image/png', pngPhoto.subarray(0, 4)],
  ]) {
    assert.deepEqual(await uploadPhoto({ tipoMime, conteudo }), {
      status: 415, body: { erro: 'O arquivo não corresponde ao formato JPG ou PNG informado.' },
    })
  }
  assert.deepEqual(await uploadPhoto({ conteudo: Buffer.alloc(0) }), {
    status: 400, body: { erro: 'O arquivo está vazio.' },
  })
  assert.equal(query.mock.callCount(), 0)
})

test('upload aceita exatamente 10 MB e devolve erro JSON acima do limite', async () => {
  const limite = 10 * 1024 * 1024
  const conteudo = Buffer.alloc(limite)
  pngPhoto.copy(conteudo)
  respondWith([{ id: 7, tamanho_bytes: limite }])
  assert.equal((await uploadPhoto({ conteudo })).status, 201)
  assert.equal(query.mock.calls[0].arguments[1][4].length, limite)

  assert.deepEqual(await uploadPhoto({ conteudo: Buffer.alloc(limite + 1) }), {
    status: 413, body: { erro: 'A foto deve ter no máximo 10 MB.' },
  })
  assert.equal(query.mock.callCount(), 1)
})

test('upload informa usuário inexistente e falhas de gravação com JSON', async () => {
  respondWith(Object.assign(new Error('Chave estrangeira inválida'), { code: '23503' }))
  assert.deepEqual(await uploadPhoto(), { status: 404, body: { erro: 'Usuário não encontrado.' } })

  respondWith(new Error('Banco indisponível no teste'))
  assert.deepEqual(await uploadPhoto(), { status: 500, body: { erro: 'Erro ao salvar a foto.' } })
})

test('listagem e cadastro mantêm os dados públicos e armazenam a senha como hash', async () => {
  respondWith([usuario], [usuario])
  assert.deepEqual(await request('/usuarios'), { status: 200, body: [usuario] })
  assert.doesNotMatch(query.mock.calls[0].arguments[0], /senha_hash/)
  assert.deepEqual(await request('/usuarios', { ...usuario, telefone: '123', senha }), {
    status: 201, body: usuario,
  })
  const parameters = query.mock.calls[1].arguments[1]
  assert.deepEqual(parameters.slice(0, 4), ['Ana', 'ana', '123', 'ana@example.test'])
  assert.equal(await bcrypt.compare(senha, parameters[4]), true)
})

test('cadastro mantém a resposta de apelido duplicado', async () => {
  respondWith(Object.assign(new Error('Duplicado'), { code: '23505' }))
  assert.deepEqual(await request('/usuarios', { ...usuario, senha }), {
    status: 409, body: { erro: 'Apelido já está em uso.' },
  })
})

test('login aceita apelido ou e-mail e não devolve o hash', async () => {
  for (const usernameOrEmail of [usuario.apelido, usuario.email]) {
    respondWith([usuarioComSenha])
    assert.deepEqual(await request('/login', { usernameOrEmail, senha }), { status: 200, body: usuario })
    assert.deepEqual(query.mock.calls.at(-1).arguments[1], [usernameOrEmail])
  }
})

test('login mantém respostas para dados ausentes, usuário inexistente, inativo e senha incorreta', async () => {
  assert.deepEqual(await request('/login', {}), { status: 400, body: { erro: 'Parâmetros inválidos.' } })
  assert.equal(query.mock.callCount(), 0)
  for (const [rows, password, status, erro] of [
    [[], senha, 401, 'Usuário ou senha incorretos.'],
    [[{ ...usuarioComSenha, ativo: false }], senha, 403, 'Usuário desativado.'],
    [[usuarioComSenha], 'incorreta', 401, 'Usuário ou senha incorretos.'],
  ]) {
    respondWith(rows)
    assert.deepEqual(await request('/login', { usernameOrEmail: 'ana', senha: password }), { status, body: { erro } })
  }
})

test('recuperação mantém resposta neutra e gera link configurável com validade de 30 minutos', async () => {
  const expected = { status: 200, body: { mensagem: 'Se o e-mail existir, enviaremos as instruções.' } }
  respondWith([])
  assert.deepEqual(await request('/esqueci-senha', { email: usuario.email }), expected)
  assert.equal(sendEmail.mock.callCount(), 0)
  respondWith([{ id: usuario.id }], [])
  const startedAt = Date.now()
  assert.deepEqual(await request('/esqueci-senha', { email: usuario.email }), expected)
  const [token, expiresAt, userId] = query.mock.calls.at(-1).arguments[1]
  assert.match(token, /^[a-f0-9]{64}$/)
  assert.equal(userId, usuario.id)
  assert.ok(expiresAt.getTime() >= startedAt + 30 * 60 * 1000)
  assert.ok(expiresAt.getTime() <= Date.now() + 30 * 60 * 1000)
  const mail = sendEmail.mock.calls[0].arguments[0]
  assert.equal(mail.to, usuario.email)
  assert.equal(mail.from, 'sender@example.test')
  assert.ok(mail.html.includes(`https://frontend.example.test/redefinir-senha?token=${token}`))
})

test('redefinição rejeita token inválido ou expirado e limpa o token após trocar a senha', async () => {
  const body = { token: 'test-token', novaSenha: 'nova-senha' }
  for (const rows of [[], [{ id: 1, token_redefinicao_senha_expira: new Date(Date.now() - 1000) }]]) {
    respondWith(rows)
    assert.deepEqual(await request('/redefinir-senha', body), {
      status: 400, body: { erro: 'Token inválido ou expirado.' },
    })
  }
  respondWith([{ id: 1, token_redefinicao_senha_expira: new Date(Date.now() + 60000) }], [])
  assert.deepEqual(await request('/redefinir-senha', body), {
    status: 200, body: { mensagem: 'Senha redefinida com sucesso.' },
  })
  const [sql, [hash, userId]] = query.mock.calls.at(-1).arguments
  assert.equal(userId, 1)
  assert.equal(await bcrypt.compare(body.novaSenha, hash), true)
  assert.match(sql, /token_redefinicao_senha = NULL, token_redefinicao_senha_expira = NULL/)
})

test('recuperação e redefinição validam os campos antes de acessar o banco', async () => {
  for (const path of ['/esqueci-senha', '/redefinir-senha']) {
    assert.deepEqual(await request(path, {}), { status: 400, body: { erro: 'Parâmetros inválidos.' } })
  }
  assert.equal(query.mock.callCount(), 0)
})

test('falhas dos serviços mantêm os erros de cada endpoint', async () => {
  for (const [path, body, erro] of [
    ['/usuarios', undefined, 'Erro ao buscar usuários.'],
    ['/usuarios', { ...usuario, senha }, 'Erro ao criar usuário.'],
    ['/login', { usernameOrEmail: 'ana', senha }, 'Erro ao fazer login.'],
    ['/esqueci-senha', { email: usuario.email }, 'Erro ao processar solicitação.'],
    ['/redefinir-senha', { token: 'test', novaSenha: senha }, 'Erro ao redefinir senha.'],
  ]) {
    respondWith(new Error('Banco indisponível no teste'))
    assert.deepEqual(await request(path, body), { status: 500, body: { erro } })
  }
  respondWith([{ id: 1 }], [])
  sendEmail.mock.mockImplementation(async () => { throw new Error('E-mail indisponível no teste') })
  assert.deepEqual(await request('/esqueci-senha', { email: usuario.email }), {
    status: 500, body: { erro: 'Erro ao processar solicitação.' },
  })
})
