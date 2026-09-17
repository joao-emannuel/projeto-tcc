import assert from 'node:assert/strict'
import { after, before, beforeEach, mock, test } from 'node:test'
import bcrypt from 'bcrypt'
import crypto from 'node:crypto'

// Impede qualquer leitura do .env, conexão com PostgreSQL ou envio real de e-mail.
const query = mock.fn()
const sendEmail = mock.fn()
const release = mock.fn()
mock.module('../src/database.js', { namedExports: { pool: { query, connect: async () => ({ query, release }) } } })
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
const { createSession } = await import('../src/services/sessionService.js')
const senha = 'senha-de-teste'
const usuario = { id: 1, nome: 'Ana', apelido: 'ana', email: 'ana@example.test', telefone: '11999999999', nivel_acesso: 'usuario', ativo: true, troca_senha_pendente: false }
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
  release.mock.resetCalls()
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

async function request(path, body, { token, method = body === undefined ? 'GET' : 'POST' } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
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

test('rotas antigas exigem administrador e não permitem cadastrar sem verificar e-mail', async () => {
  assert.equal((await request('/usuarios')).status, 401)
  assert.equal((await request('/usuarios', usuario)).status, 401)
  const token = createSession(1)
  respondWith([usuario])
  assert.equal((await request('/usuarios', undefined, { token })).status, 403)
  const admin = { ...usuario, nivel_acesso: 'admin' }
  respondWith([admin], [usuario])
  assert.deepEqual(await request('/usuarios', undefined, { token }), { status: 200, body: [usuario] })
  assert.doesNotMatch(query.mock.calls.at(-1).arguments[0], /senha_hash/)
  respondWith([admin])
  assert.equal((await request('/usuarios', usuario, { token })).status, 410)
})

test('login aceita apelido ou e-mail e não devolve o hash', async () => {
  for (const usernameOrEmail of [usuario.apelido, usuario.email]) {
    respondWith([usuarioComSenha])
    const result = await request('/login', { usernameOrEmail, senha })
    const { sessionToken, ...user } = result.body
    assert.equal(result.status, 200)
    assert.deepEqual(user, usuario)
    assert.match(sessionToken, /^[a-f0-9]{64}$/)
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

const administrador = { ...usuario, id: 9, apelido: 'administrador', nivel_acesso: 'admin' }
const newUserInput = { nome: '  Bruno Souza  ', apelido: '  bruno  ', telefone: '(11) 98888-7777', email: ' BRUNO@EXAMPLE.TEST ', nivel_acesso: 'usuario' }
const registrationId = 'ce2c70dc-a72f-4c7a-8534-9a5444f8d24e'
const pending = {
  id: registrationId, administrador_id: 9, nome: 'Bruno Souza', apelido: 'bruno', telefone: '(11) 98888-7777', email: 'bruno@example.test',
  nivel_acesso: 'usuario', senha_hash: usuarioComSenha.senha_hash,
  codigo_hash: crypto.createHash('sha256').update('123456').digest('hex'), expira_em: new Date(Date.now() + 1800000),
}
const registeredUser = { ...usuario, id: 3, nome: pending.nome, apelido: pending.apelido, email: pending.email, troca_senha_pendente: true }

// Estado transacional em memória: os testes abaixo passam pelas rotas e pelo serviço reais.
function registrationDatabase() {
  const state = { pending: [], sends: [], users: [] }
  let snapshot
  query.mock.mockImplementation(async (sql, values = []) => {
    let rows = []
    if (sql === 'BEGIN') snapshot = structuredClone(state)
    else if (sql === 'ROLLBACK') Object.assign(state, snapshot)
    else if (sql === 'COMMIT' || sql.includes('pg_advisory_xact_lock')) { /* controle transacional */ }
    else if (sql.startsWith('SELECT id FROM usuarios WHERE (lower')) rows = state.users.filter(user => user.email === values[1] || user.apelido === values[0])
    else if (sql.includes('FROM usuarios WHERE id = $1')) rows = [{ ...administrador, id: values[0] }]
    else if (sql.includes('SELECT enviado_em FROM envios_cadastro')) {
      assert.match(sql, /administrador_id = \$1 AND email = \$2 AND enviado_em > \$3 ORDER BY enviado_em/)
      rows = state.sends.filter(row => row.administrador_id === values[0] && row.email === values[1] && row.enviado_em > values[2])
    } else if (sql.startsWith('INSERT INTO envios_cadastro')) {
      state.sends.push({ administrador_id: values[0], email: values[1], enviado_em: values[2] })
    } else if (sql.startsWith('DELETE FROM envios_cadastro')) {
      state.sends = state.sends.filter(row => row.enviado_em > values[0])
    } else if (sql.startsWith('INSERT INTO cadastros_pendentes')) {
      const keys = ['id', 'administrador_id', 'nome', 'apelido', 'telefone', 'email', 'nivel_acesso', 'senha_hash', 'codigo_hash', 'expira_em']
      state.pending.push({ ...Object.fromEntries(keys.map((key, index) => [key, values[index]])), tentativas_incorretas: 0 })
    } else if (sql.startsWith('SELECT * FROM cadastros_pendentes')) {
      assert.match(sql, /administrador_id = \$2 FOR UPDATE/)
      rows = state.pending.filter(row => row.id === values[0] && row.administrador_id === values[1])
    } else if (sql.startsWith('UPDATE cadastros_pendentes SET tentativas_incorretas')) {
      const row = state.pending.find(row => row.id === values[0])
      rows = [{ tentativas_incorretas: ++row.tentativas_incorretas }]
    } else if (sql.startsWith('UPDATE cadastros_pendentes SET senha_hash')) {
      Object.assign(state.pending.find(row => row.id === values[3]), {
        senha_hash: values[0], codigo_hash: values[1], expira_em: values[2], tentativas_incorretas: 0,
      })
    } else if (sql.startsWith('INSERT INTO usuarios')) {
      const user = { ...registeredUser, senha_hash: values[5] }
      state.users.push(user)
      rows = [user]
    } else if (sql.startsWith('DELETE FROM cadastros_pendentes')) {
      state.pending = state.pending.filter(row => row.id !== values[0])
    } else throw new Error(`Consulta inesperada: ${sql}`)
    return { rows }
  })
  return state
}

function latestRegistrationCode() {
  return /<strong>(\d{6})<\/strong>/.exec(sendEmail.mock.calls.at(-1).arguments[0].html)[1]
}

test('admin: cinco erros persistem, bloqueiam inclusive o código correto e reenvio libera um novo código', async t => {
  let now = Date.now()
  t.mock.method(Date, 'now', () => now)
  const state = registrationDatabase()
  const token = createSession(9)
  const created = await request('/admin/cadastros', newUserInput, { token })
  const id = created.body.cadastroId
  const originalCode = latestRegistrationCode()
  const incorrectCode = originalCode === '000000' ? '111111' : '000000'
  for (let attempt = 1; attempt <= 5; attempt++) {
    const result = await request(`/admin/cadastros/${id}/confirmar`, { codigo: incorrectCode }, { token })
    assert.equal(result.status, attempt === 5 ? 429 : 400)
    assert.equal(result.body.tentativasRestantes, 5 - attempt)
    assert.equal(state.pending[0].tentativas_incorretas, attempt)
    assert.equal(query.mock.calls.at(-1).arguments[0], 'COMMIT')
  }
  const blocked = await request(`/admin/cadastros/${id}/confirmar`, { codigo: originalCode }, { token })
  assert.equal(blocked.status, 429)
  assert.equal(blocked.body.codigoBloqueado, true)
  assert.equal(state.users.length, 0)
  now += 30000
  assert.equal((await request(`/admin/cadastros/${id}/reenviar`, {}, { token })).status, 200)
  const newCode = latestRegistrationCode()
  assert.notEqual(newCode, originalCode)
  assert.equal(state.pending[0].tentativas_incorretas, 0)
  assert.equal((await request(`/admin/cadastros/${id}/confirmar`, { codigo: newCode }, { token })).status, 201)
  assert.equal(state.pending.length, 0)
  assert.equal(state.users.length, 1)
  assert.equal((await request(`/admin/cadastros/${id}/confirmar`, { codigo: newCode }, { token })).status, 404)
})

test('admin: cooldown e cinco envios por hora valem entre cadastros novos; cota é por administrador e e-mail', async t => {
  const start = Date.now()
  let now = start
  t.mock.method(Date, 'now', () => now)
  const state = registrationDatabase()
  const token = createSession(9)
  const created = await request('/admin/cadastros', newUserInput, { token })
  const id = created.body.cadastroId
  for (const path of ['/admin/cadastros', `/admin/cadastros/${id}/reenviar`]) {
    const result = await request(path, newUserInput, { token })
    assert.equal(result.status, 429)
    assert.equal(result.body.retryAfterSeconds, 30)
    assert.equal(result.body.reenviarEm, new Date(start + 30000).toISOString())
  }
  for (let attempt = 2; attempt <= 5; attempt++) {
    now += 30000
    // Alterar maiúsculas e abrir outro ID não reinicia a cota.
    assert.equal((await request('/admin/cadastros', { ...newUserInput, email: attempt % 2 ? 'bruno@example.test' : 'BRUNO@example.test' }, { token })).status, 201)
  }
  now += 30000
  const limited = await request(`/admin/cadastros/${id}/reenviar`, {}, { token })
  assert.equal(limited.status, 429)
  assert.equal(limited.body.retryAfterSeconds, 3450)
  assert.equal(limited.body.reenviarEm, new Date(start + 3600000).toISOString())
  assert.equal((await request('/admin/cadastros', newUserInput, { token })).status, 429)
  assert.equal(state.sends.length, 5)
  assert.equal(sendEmail.mock.callCount(), 5)
  // Outro administrador tem sua própria cota, mas não pode reutilizar o cadastro alheio.
  const otherToken = createSession(10)
  assert.equal((await request(`/admin/cadastros/${id}/reenviar`, {}, { token: otherToken })).status, 404)
  assert.equal((await request('/admin/cadastros', newUserInput, { token: otherToken })).status, 201)
  assert.equal((await request('/admin/cadastros', { ...newUserInput, email: 'outro@example.test' }, { token })).status, 201)
  now = start + 3600000
  assert.equal((await request('/admin/cadastros', newUserInput, { token })).status, 201)
})

test('admin: falha de e-mail não deixa cadastro, não gasta cota e preserva código anterior no reenvio', async t => {
  let now = Date.now()
  t.mock.method(Date, 'now', () => now)
  const state = registrationDatabase()
  const token = createSession(9)
  sendEmail.mock.mockImplementation(async () => ({ error: { message: 'falha simulada' } }))
  assert.equal((await request('/admin/cadastros', newUserInput, { token })).status, 502)
  assert.equal(state.pending.length, 0)
  assert.equal(state.sends.length, 0)
  sendEmail.mock.mockImplementation(async () => ({ data: { id: 'test' }, error: null }))
  const created = await request('/admin/cadastros', newUserInput, { token })
  assert.equal(created.status, 201)
  const original = structuredClone(state.pending[0])
  now += 30000
  sendEmail.mock.mockImplementation(async () => ({ error: { message: 'falha simulada' } }))
  assert.equal((await request(`/admin/cadastros/${created.body.cadastroId}/reenviar`, {}, { token })).status, 502)
  assert.deepEqual(state.pending[0], original)
  assert.equal(state.sends.length, 1)
  sendEmail.mock.mockImplementation(async () => ({ data: { id: 'test' }, error: null }))
  assert.equal((await request(`/admin/cadastros/${created.body.cadastroId}/reenviar`, {}, { token })).status, 200)
  assert.equal(state.sends.length, 2)
})

test('admin: sessão obrigatória, perfil reconsultado e desativação bloqueia acesso', async () => {
  for (const path of ['/admin/usuarios', '/conta']) {
    assert.equal((await request(path)).status, 401)
    assert.equal((await request(path, undefined, { token: 'a'.repeat(64) })).status, 401)
  }
  const token = createSession(1)
  respondWith([usuario])
  assert.equal((await request('/admin/usuarios', undefined, { token })).status, 403)
  respondWith([{ ...usuario, ativo: false }])
  assert.equal((await request('/conta', undefined, { token })).status, 401)
  assert.equal((await request('/conta', undefined, { token })).status, 401)
})

test('admin: aceita os perfis admin e administrador e devolve somente dados públicos', async () => {
  const token = createSession(9)
  for (const nivel_acesso of ['admin', 'administrador']) {
    respondWith([{ ...administrador, nivel_acesso }], [{ ...usuarioComSenha, token_redefinicao_senha: 'segredo' }])
    assert.deepEqual(await request('/admin/usuarios', undefined, { token }), { status: 200, body: [usuario] })
  }
})

test('admin: cadastro envia código e senha inicial mas persiste somente hashes sem criar conta', async () => {
  const token = createSession(9)
  respondWith([administrador], [], [], [], [], [], [], [], [])
  const before = Date.now()
  const result = await request('/admin/cadastros', newUserInput, { token })
  assert.equal(result.status, 201)
  assert.deepEqual(Object.keys(result.body).sort(), ['cadastroId', 'email', 'expiraEm', 'reenviarEm'])
  assert.ok(new Date(result.body.reenviarEm).getTime() >= before + 30000)
  assert.equal(result.body.email, 'bruno@example.test')
  assert.ok(new Date(result.body.expiraEm).getTime() >= before + 1800000)
  const mail = sendEmail.mock.calls[0].arguments[0]
  assert.equal(mail.to, 'bruno@example.test')
  const codigo = /<strong>(\d{6})<\/strong>/.exec(mail.html)[1]
  const senhaInicial = /<p><strong>([^<]+)<\/strong><\/p>/.exec(mail.html)[1]
  const insert = query.mock.calls.find(call => call.arguments[0].includes('INSERT INTO cadastros_pendentes'))
  const params = insert.arguments[1]
  assert.deepEqual(params.slice(1, 7), [9, 'Bruno Souza', 'bruno', '(11) 98888-7777', 'bruno@example.test', 'usuario'])
  assert.equal(await bcrypt.compare(senhaInicial, params[7]), true)
  assert.match(mail.html, /senha inicial/)
  assert.doesNotMatch(mail.html, /senha temporária/)
  assert.equal(params[8], crypto.createHash('sha256').update(codigo).digest('hex'))
  assert.ok(!query.mock.calls.some(call => /INSERT INTO usuarios/.test(call.arguments[0])))
  assert.equal(query.mock.calls.at(-1).arguments[0], 'COMMIT')
  assert.equal(release.mock.callCount(), 1)
})

test('admin: dados inválidos e e-mail/apelido duplicados não enviam verificação', async () => {
  const token = createSession(9)
  for (const patch of [{ nome: '' }, { email: 'invalido' }, { telefone: '123' }, { nivel_acesso: 'superadmin' }]) {
    respondWith([administrador])
    assert.equal((await request('/admin/cadastros', { ...newUserInput, ...patch }, { token })).status, 400)
  }
  respondWith([administrador], [], [], [{ id: 20 }], [])
  assert.equal((await request('/admin/cadastros', newUserInput, { token })).status, 409)
  assert.equal(sendEmail.mock.callCount(), 0)
  assert.equal(query.mock.calls.at(-1).arguments[0], 'ROLLBACK')
})

test('admin: erro retornado pelo Resend desfaz cadastro pendente e permite tentar novamente', async () => {
  const token = createSession(9)
  respondWith([administrador], [], [], [], [], [], [])
  sendEmail.mock.mockImplementation(async () => ({ data: null, error: { message: 'provider rejected' } }))
  assert.equal((await request('/admin/cadastros', newUserInput, { token })).status, 502)
  assert.equal(query.mock.calls.at(-1).arguments[0], 'ROLLBACK')
  assert.equal(release.mock.callCount(), 1)
})

test('admin: confirmação cria uma conta com senha pendente e consome cadastro na mesma transação', async () => {
  const token = createSession(9)
  respondWith([administrador], [], [], [pending], [], [registeredUser], [], [])
  assert.deepEqual(await request(`/admin/cadastros/${registrationId}/confirmar`, { codigo: '123456' }, { token }), {
    status: 201, body: { usuario: registeredUser },
  })
  const calls = query.mock.calls.map(call => call.arguments)
  assert.ok(calls.some(([sql]) => sql.includes('pg_advisory_xact_lock')))
  const locked = calls.find(([sql]) => sql.includes('FROM cadastros_pendentes'))
  assert.match(locked[0], /FOR UPDATE/)
  assert.deepEqual(locked[1], [registrationId, 9])
  const insert = calls.find(([sql]) => sql.includes('INSERT INTO usuarios'))
  assert.match(insert[0], /troca_senha_pendente/)
  assert.equal(insert[1][5], pending.senha_hash)
  assert.ok(calls.some(([sql]) => sql.includes('DELETE FROM cadastros_pendentes')))
  assert.equal(calls.at(-1)[0], 'COMMIT')
  assert.equal(sendEmail.mock.callCount(), 0)

  respondWith([administrador], [], [], [], [])
  assert.equal((await request(`/admin/cadastros/${registrationId}/confirmar`, { codigo: '123456' }, { token })).status, 404)
})

test('admin: código incorreto persiste tentativa; expirado ou ausente não cria usuário', async () => {
  const token = createSession(9)
  for (const [rows, codigo, status, responses, transactionEnd] of [
    [[pending], '000000', 400, [[{ tentativas_incorretas: 1 }], []], 'COMMIT'],
    [[{ ...pending, expira_em: new Date(Date.now() - 1000) }], '123456', 400, [[]], 'ROLLBACK'],
    [[], '123456', 404, [[]], 'ROLLBACK'],
  ]) {
    respondWith([administrador], [], [], rows, ...responses)
    assert.equal((await request(`/admin/cadastros/${registrationId}/confirmar`, { codigo }, { token })).status, status)
    assert.equal(query.mock.calls.at(-1).arguments[0], transactionEnd)
  }
  assert.ok(!query.mock.calls.some(call => call.arguments[0].includes('INSERT INTO usuarios')))
})

test('admin: reenvio troca código/senha e renova validade do mesmo cadastro', async () => {
  const token = createSession(9)
  respondWith([administrador], [], [], [pending], [], [], [], [], [], [])
  assert.equal((await request(`/admin/cadastros/${registrationId}/reenviar`, {}, { token })).status, 200)
  const update = query.mock.calls.find(call => call.arguments[0].includes('UPDATE cadastros_pendentes'))
  const [senhaHash, codigoHash, expiraEm, id] = update.arguments[1]
  assert.match(update.arguments[0], /tentativas_incorretas = 0/)
  assert.equal(id, registrationId)
  assert.notEqual(senhaHash, pending.senha_hash)
  assert.ok(expiraEm.getTime() > Date.now() + 1790000)
  const html = sendEmail.mock.calls[0].arguments[0].html
  const codigo = /<strong>(\d{6})<\/strong>/.exec(html)[1]
  const senhaInicial = /<p><strong>([^<]+)<\/strong><\/p>/.exec(html)[1]
  assert.equal(codigoHash, crypto.createHash('sha256').update(codigo).digest('hex'))
  assert.equal(await bcrypt.compare(senhaInicial, senhaHash), true)
})

test('admin: edição permite desativar usuário, preserva fotos e impede trocar e-mail verificado', async () => {
  const token = createSession(9)
  respondWith([administrador], [], [], [usuario], [], [{ ...usuario, ativo: false }], [])
  assert.deepEqual(await request('/admin/usuarios/1', { ativo: false }, { token, method: 'PATCH' }), {
    status: 200, body: { usuario: { ...usuario, ativo: false } },
  })
  assert.ok(!query.mock.calls.some(call => /DELETE/.test(call.arguments[0])))
  respondWith([administrador], [], [], [usuario], [])
  assert.equal((await request('/admin/usuarios/1', { email: 'outro@example.test' }, { token, method: 'PATCH' })).status, 400)
})

test('admin: não pode desativar/rebaixar a própria conta ou o último administrador ativo', async () => {
  const token = createSession(9)
  for (const patch of [{ ativo: false }, { nivel_acesso: 'usuario' }]) {
    respondWith([administrador], [], [], [administrador], [])
    assert.equal((await request('/admin/usuarios/9', patch, { token, method: 'PATCH' })).status, 400)
  }
  respondWith([administrador], [], [], [{ ...administrador, id: 2 }], [{ total: 1 }], [])
  assert.equal((await request('/admin/usuarios/2', { ativo: false }, { token, method: 'PATCH' })).status, 400)
})

test('admin: opção redundante de recuperação de senha foi removida', async () => {
  const token = createSession(9)
  respondWith([administrador])
  const result = await fetch(`${baseUrl}/admin/usuarios/1/recuperar-senha`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}` },
  })
  assert.equal(result.status, 404)
  assert.equal(sendEmail.mock.callCount(), 0)
})

test('primeiro acesso: usuário troca a própria senha e limpa sinalização/token de recuperação', async () => {
  const token = createSession(3)
  const novaSenha = 'nova-senha-2026'
  respondWith([registeredUser], [], [{ ...registeredUser, troca_senha_pendente: false }])
  const result = await request('/conta/senha', { novaSenha, confirmarSenha: novaSenha, usuarioId: 9 }, { token })
  assert.equal(result.status, 200)
  assert.equal(result.body.usuario.troca_senha_pendente, false)
  const [sql, [hash, id]] = query.mock.calls.at(-2).arguments
  assert.equal(id, 3)
  assert.equal(await bcrypt.compare(novaSenha, hash), true)
  assert.match(sql, /troca_senha_pendente = false/)
  assert.match(sql, /token_redefinicao_senha = NULL/)
})

test('primeiro acesso: senha curta ou confirmação diferente não altera o banco', async () => {
  const token = createSession(3)
  for (const body of [{ novaSenha: 'curta', confirmarSenha: 'curta' }, { novaSenha: 'nova-senha', confirmarSenha: 'outra-senha' }]) {
    respondWith([registeredUser])
    assert.equal((await request('/conta/senha', body, { token })).status, 400)
  }
  assert.equal(query.mock.callCount(), 2)
})

test('primeiro acesso: fechar aviso dispensa pop-up e mantém a senha inicial', async () => {
  const token = createSession(3)
  respondWith([registeredUser], [])
  const result = await request('/conta/adiar-senha', {}, { token })
  assert.equal(result.status, 200)
  assert.equal(result.body.usuario.troca_senha_pendente, false)
  assert.doesNotMatch(query.mock.calls.at(-1).arguments[0], /senha_hash/)
  assert.deepEqual(query.mock.calls.at(-1).arguments[1], [3])
})

test('conta: consulta sessão atual e logout revoga token', async () => {
  const token = createSession(1)
  respondWith([usuario], [usuario])
  assert.deepEqual(await request('/conta', undefined, { token }), { status: 200, body: usuario })
  assert.equal((await request('/logout', {}, { token })).status, 200)
  assert.equal((await request('/conta', undefined, { token })).status, 401)
})

const galleryRow = { id: 12, corte_nome: 'Low Fade', criado_em: '2026-09-17T12:00:00.000Z', favorito: false, preview_url: null }
const galleryResult = { id: 12, corteNome: 'Low Fade', criadoEm: galleryRow.criado_em, favorito: false, previewUrl: null }

test('galeria: todas as operações exigem sessão', async () => {
  for (const [path, method] of [['/galeria', 'GET'], ['/galeria/12', 'GET'], ['/galeria/12', 'PATCH'], ['/galeria/12', 'DELETE']]) {
    assert.equal((await request(path, method === 'PATCH' ? { favorito: true } : undefined, { method })).status, 401)
  }
  assert.equal(query.mock.callCount(), 0)
})

test('galeria: lista apenas resultados do usuário autenticado, incluindo estado vazio', async () => {
  const token = createSession(1)
  respondWith([usuario], [])
  assert.deepEqual(await request('/galeria', undefined, { token }), { status: 200, body: { resultados: [] } })
  respondWith([usuario], [{ ...galleryRow, usuario_id: 1, foto_id: 8 }])
  assert.deepEqual(await request('/galeria?usuarioId=9', undefined, { token }), { status: 200, body: { resultados: [galleryResult] } })
  const [sql, params] = query.mock.calls.at(-1).arguments
  assert.match(sql, /WHERE usuario_id = \$1 ORDER BY criado_em DESC, id DESC/)
  assert.deepEqual(params, [1])
})

test('galeria: visualiza e favorita usando a conta da sessão, mesmo para administradores', async () => {
  const token = createSession(9)
  respondWith([administrador], [galleryRow])
  assert.deepEqual(await request('/galeria/12', undefined, { token }), { status: 200, body: { resultado: galleryResult } })
  assert.deepEqual(query.mock.calls.at(-1).arguments[1], [12, 9])
  respondWith([administrador], [{ ...galleryRow, favorito: true }])
  assert.deepEqual(await request('/galeria/12', { favorito: true, usuarioId: 1 }, { token, method: 'PATCH' }), {
    status: 200, body: { resultado: { ...galleryResult, favorito: true } },
  })
  assert.deepEqual(query.mock.calls.at(-1).arguments[1], [true, 12, 9])
  assert.match(query.mock.calls.at(-1).arguments[0], /WHERE id = \$2 AND usuario_id = \$3/)
})

test('galeria: resultado ausente ou de outra conta não pode ser aberto, favoritado ou excluído', async () => {
  const token = createSession(1)
  for (const method of ['GET', 'PATCH', 'DELETE']) {
    respondWith([usuario], [])
    assert.deepEqual(await request('/galeria/12', method === 'PATCH' ? { favorito: true } : undefined, { token, method }), {
      status: 404, body: { erro: 'Resultado não encontrado na sua galeria.' },
    })
    assert.match(query.mock.calls.at(-1).arguments[0], /AND usuario_id =/)
  }
})

test('galeria: valida identificador e favorito antes de alterar resultados', async () => {
  const token = createSession(1)
  for (const id of ['0', '-1', '01', '1.5', 'abc', '2147483648']) {
    respondWith([usuario])
    assert.equal((await request(`/galeria/${id}`, undefined, { token })).status, 400)
  }
  for (const body of [{}, { favorito: 'true' }, { favorito: 1 }]) {
    respondWith([usuario])
    assert.equal((await request('/galeria/12', body, { token, method: 'PATCH' })).status, 400)
  }
  assert.equal(query.mock.callCount(), 9)
})

test('galeria: excluir remove somente o resultado; falha do banco retorna erro recuperável', async () => {
  const token = createSession(1)
  respondWith([usuario], [{ id: 12 }])
  assert.deepEqual(await request('/galeria/12', undefined, { token, method: 'DELETE' }), {
    status: 200, body: { mensagem: 'Resultado excluído da galeria.' },
  })
  assert.equal(query.mock.calls.at(-1).arguments[0], 'DELETE FROM resultados WHERE id = $1 AND usuario_id = $2 RETURNING id')
  assert.deepEqual(query.mock.calls.at(-1).arguments[1], [12, 1])
  respondWith([usuario], new Error('Banco indisponível'))
  assert.deepEqual(await request('/galeria', undefined, { token }), {
    status: 500, body: { erro: 'Não foi possível acessar a galeria. Tente novamente.' },
  })
})

test('galeria: gravação interna para futura IA exige foto pertencente ao usuário', async () => {
  const { saveGalleryResult } = await import('../src/services/galleryService.js')
  const input = { usuarioId: 1, fotoId: 8, corteNome: ' Low Fade ' }
  respondWith([galleryRow])
  assert.deepEqual(await saveGalleryResult(input), { resultado: galleryResult })
  const [sql, params] = query.mock.calls.at(-1).arguments
  assert.match(sql, /FROM fotos WHERE id = \$2 AND usuario_id = \$1/)
  assert.deepEqual(params, [1, 8, 'Low Fade', null])
  respondWith([])
  await assert.rejects(saveGalleryResult(input), { status: 404 })
  for (const patch of [{ fotoId: 0 }, { corteNome: '' }, { previewUrl: 'javascript:alert(1)' }, { previewUrl: '//other.example.test/a.png' }]) {
    await assert.rejects(saveGalleryResult({ ...input, ...patch }), { status: 400 })
  }
  assert.equal(query.mock.callCount(), 2)
})
