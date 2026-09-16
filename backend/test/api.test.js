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

test('admin: cadastro envia código e senha temporária mas persiste somente hashes sem criar conta', async () => {
  const token = createSession(9)
  respondWith([administrador], [], [], [], [], [])
  const before = Date.now()
  const result = await request('/admin/cadastros', newUserInput, { token })
  assert.equal(result.status, 201)
  assert.deepEqual(Object.keys(result.body).sort(), ['cadastroId', 'email', 'expiraEm'])
  assert.equal(result.body.email, 'bruno@example.test')
  assert.ok(new Date(result.body.expiraEm).getTime() >= before + 1800000)
  const mail = sendEmail.mock.calls[0].arguments[0]
  assert.equal(mail.to, 'bruno@example.test')
  const codigo = /<strong>(\d{6})<\/strong>/.exec(mail.html)[1]
  const senhaTemporaria = /<p><strong>([^<]+)<\/strong><\/p>/.exec(mail.html)[1]
  const insert = query.mock.calls.find(call => call.arguments[0].includes('INSERT INTO cadastros_pendentes'))
  const params = insert.arguments[1]
  assert.deepEqual(params.slice(1, 7), [9, 'Bruno Souza', 'bruno', '(11) 98888-7777', 'bruno@example.test', 'usuario'])
  assert.equal(await bcrypt.compare(senhaTemporaria, params[7]), true)
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
  respondWith([administrador], [], [], [], [], [])
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

test('admin: código incorreto, expirado ou de cadastro ausente não cria usuário', async () => {
  const token = createSession(9)
  for (const [rows, codigo, status] of [
    [[pending], '000000', 400],
    [[{ ...pending, expira_em: new Date(Date.now() - 1000) }], '123456', 400],
    [[], '123456', 404],
  ]) {
    respondWith([administrador], [], [], rows, [])
    assert.equal((await request(`/admin/cadastros/${registrationId}/confirmar`, { codigo }, { token })).status, status)
    assert.equal(query.mock.calls.at(-1).arguments[0], 'ROLLBACK')
  }
  assert.ok(!query.mock.calls.some(call => call.arguments[0].includes('INSERT INTO usuarios')))
})

test('admin: reenvio troca código/senha e renova validade do mesmo cadastro', async () => {
  const token = createSession(9)
  respondWith([administrador], [], [], [pending], [], [], [])
  assert.equal((await request(`/admin/cadastros/${registrationId}/reenviar`, {}, { token })).status, 200)
  const update = query.mock.calls.find(call => call.arguments[0].includes('UPDATE cadastros_pendentes'))
  const [senhaHash, codigoHash, expiraEm, id] = update.arguments[1]
  assert.equal(id, registrationId)
  assert.notEqual(senhaHash, pending.senha_hash)
  assert.ok(expiraEm.getTime() > Date.now() + 1790000)
  const html = sendEmail.mock.calls[0].arguments[0].html
  const codigo = /<strong>(\d{6})<\/strong>/.exec(html)[1]
  const senhaTemporaria = /<p><strong>([^<]+)<\/strong><\/p>/.exec(html)[1]
  assert.equal(codigoHash, crypto.createHash('sha256').update(codigo).digest('hex'))
  assert.equal(await bcrypt.compare(senhaTemporaria, senhaHash), true)
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

test('admin: recuperação envia link para o e-mail cadastrado sem devolver token ao administrador', async () => {
  const token = createSession(9)
  respondWith([administrador], [usuario], [{ id: 1 }], [])
  const result = await request('/admin/usuarios/1/recuperar-senha', {}, { token })
  assert.equal(result.status, 200)
  assert.deepEqual(Object.keys(result.body), ['mensagem'])
  assert.equal(sendEmail.mock.calls[0].arguments[0].to, usuario.email)
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

test('primeiro acesso: fechar aviso dispensa pop-up e mantém a senha temporária', async () => {
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
