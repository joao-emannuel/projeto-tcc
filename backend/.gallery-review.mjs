import assert from 'node:assert/strict'
import { mock } from 'node:test'
import pg from 'pg'
import bcrypt from 'bcrypt'
import { config } from './src/config.js'
import { applyMigrations } from './src/migrations/applyMigrations.js'

const client = new pg.Client(config.database)
let server
const mails = []
let failMail = false
await client.connect()
try {
  await client.query('SET search_path TO pg_temp')
  await client.query(`CREATE TEMP TABLE usuarios (
    id SERIAL PRIMARY KEY, nome TEXT NOT NULL, apelido TEXT UNIQUE NOT NULL, telefone TEXT NOT NULL,
    email TEXT NOT NULL, senha_hash TEXT NOT NULL, nivel_acesso TEXT DEFAULT 'usuario',
    ativo BOOLEAN DEFAULT true, criado_em TIMESTAMPTZ DEFAULT now(),
    token_redefinicao_senha TEXT, token_redefinicao_senha_expira TIMESTAMPTZ
  )`)
  const temporaryMigrations = { query: sql => client.query(sql.replaceAll('CREATE TABLE IF NOT EXISTS', 'CREATE TEMP TABLE IF NOT EXISTS')) }
  await applyMigrations(temporaryMigrations)
  await applyMigrations(temporaryMigrations)
  const tables = await client.query("SELECT relname, relpersistence FROM pg_class WHERE oid IN ('usuarios'::regclass,'fotos'::regclass,'cadastros_pendentes'::regclass,'envios_cadastro'::regclass,'resultados'::regclass)")
  assert.equal(tables.rows.length, 5)
  assert.ok(tables.rows.every(row => row.relpersistence === 't'))

  mock.module('./src/database.js', { namedExports: { pool: { query: (...args) => client.query(...args), connect: async () => ({ query: (...args) => client.query(...args), release() {} }) } } })
  mock.module('resend', { namedExports: { Resend: class { emails = { send: async message => {
    if (failMail) return { error: { message: 'Falha simulada' } }
    mails.push(message)
    return { data: { id: 'email-simulado' } }
  } } } } })
  const { default: app } = await import('./src/app.js')
  const { createSession } = await import('./src/services/sessionService.js')
  const { saveGalleryResult } = await import('./src/services/galleryService.js')
  const hash = await bcrypt.hash('Galeria-QA-2026', 10)
  const users = (await client.query(`INSERT INTO usuarios (nome,apelido,telefone,email,senha_hash,nivel_acesso)
    VALUES ('Admin de teste','qa-admin','','admin@example.test',$1,'admin'),
    ('Usuário de teste','qa-user','','user@example.test',$1,'usuario'),
    ('Outro usuário','qa-other','','other@example.test',$1,'usuario') RETURNING id`, [hash])).rows
  const [adminId, userId, otherId] = users.map(user => user.id)
  const tokens = users.map(user => createSession(user.id))
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jA7sAAAAASUVORK5CYII=', 'base64')
  app.get('/qa-preview.png', (req, res) => res.type('png').send(png))
  server = app.listen(process.argv.includes('--preview') ? 3001 : 0, '127.0.0.1')
  await new Promise(resolve => server.once('listening', resolve))
  const base = `http://127.0.0.1:${server.address().port}`
  async function request(path, { token = tokens[0], method = 'GET', body } = {}) {
    const response = await fetch(`${base}/api${path}`, {
      method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body !== undefined && { body: JSON.stringify(body) }),
    })
    return { status: response.status, body: await response.json().catch(() => null) }
  }

  assert.equal((await request('/galeria', { token: null })).status, 401)
  assert.deepEqual((await request('/galeria', { token: tokens[1] })).body, { resultados: [] })
  const photoId = (await client.query('INSERT INTO fotos (usuario_id,nome_original,tipo_mime,tamanho_bytes,conteudo) VALUES ($1,$2,$3,$4,$5) RETURNING id', [userId, 'qa.png', 'image/png', png.length, png])).rows[0].id
  await assert.rejects(saveGalleryResult({ usuarioId: otherId, fotoId: photoId, corteNome: 'Low Fade' }), { status: 404 })
  const saved = await saveGalleryResult({ usuarioId: userId, fotoId: photoId, corteNome: ' Low Fade ', previewUrl: `${base}/qa-preview.png` })
  assert.equal(saved.resultado.corteNome, 'Low Fade')
  assert.equal((await request('/galeria', { token: tokens[1] })).body.resultados.length, 1)
  assert.equal((await request(`/galeria/${saved.resultado.id}`, { token: tokens[0] })).status, 404)
  for (const method of ['GET', 'PATCH', 'DELETE']) {
    assert.equal((await request(`/galeria/${saved.resultado.id}`, { token: tokens[2], method, ...(method === 'PATCH' && { body: { favorito: true } }) })).status, 404)
  }
  const favorite = await request(`/galeria/${saved.resultado.id}`, { token: tokens[1], method: 'PATCH', body: { favorito: true, usuarioId: otherId } })
  assert.equal(favorite.body.resultado.favorito, true)
  assert.equal((await request(`/galeria/${saved.resultado.id}`, { token: tokens[1], method: 'PATCH', body: { favorito: 'true' } })).status, 400)
  assert.equal((await request(`/galeria/${saved.resultado.id}`, { token: tokens[1], method: 'DELETE' })).status, 200)
  assert.equal((await client.query('SELECT count(*)::int AS total FROM fotos')).rows[0].total, 1)
  assert.deepEqual((await request('/galeria', { token: tokens[1] })).body, { resultados: [] })

  const input = { nome: 'Cadastro QA', apelido: 'cadastro-qa', telefone: '', email: 'cadastro@example.test' }
  const start = await request('/admin/cadastros', { method: 'POST', body: input })
  assert.equal(start.status, 201)
  const pendingId = start.body.cadastroId
  const confirmationPath = `/admin/cadastros/${pendingId}/confirmar`
  const resendPath = `/admin/cadastros/${pendingId}/reenviar`
  const initialCode = /<strong>(\d{6})<\/strong>/.exec(mails.at(-1).html)[1]
  const wrongCode = initialCode === '111111' ? '222222' : '111111'
  assert.equal((await request('/admin/cadastros', { method: 'POST', body: input })).status, 429)
  assert.equal((await request(resendPath, { method: 'POST', body: {} })).status, 429)
  for (let i = 1; i <= 5; i++) {
    const wrong = await request(confirmationPath, { method: 'POST', body: { codigo: wrongCode } })
    assert.equal(wrong.status, i === 5 ? 429 : 400)
    assert.equal(wrong.body.tentativasRestantes, 5 - i)
    assert.equal((await client.query('SELECT tentativas_incorretas FROM cadastros_pendentes WHERE id=$1', [pendingId])).rows[0].tentativas_incorretas, i)
  }
  assert.equal((await request(confirmationPath, { method: 'POST', body: { codigo: initialCode } })).status, 429)
  await client.query("UPDATE envios_cadastro SET enviado_em = enviado_em - interval '31 seconds'")
  assert.equal((await request(resendPath, { method: 'POST', body: {} })).status, 200)
  assert.equal((await client.query('SELECT tentativas_incorretas FROM cadastros_pendentes WHERE id=$1', [pendingId])).rows[0].tentativas_incorretas, 0)
  const newCode = /<strong>(\d{6})<\/strong>/.exec(mails.at(-1).html)[1]
  assert.notEqual(newCode, initialCode)
  assert.equal((await request(confirmationPath, { method: 'POST', body: { codigo: newCode } })).status, 201)
  assert.equal((await request(confirmationPath, { method: 'POST', body: { codigo: newCode } })).status, 404)
  assert.equal((await request(`/admin/usuarios/${userId}/recuperar-senha`, { method: 'POST', body: {} })).status, 404)

  failMail = true
  const failedEmail = { ...input, apelido: 'failure-qa', email: 'failure@example.test' }
  assert.equal((await request('/admin/cadastros', { method: 'POST', body: failedEmail })).status, 502)
  assert.equal((await client.query('SELECT count(*)::int AS total FROM cadastros_pendentes WHERE email=$1', [failedEmail.email])).rows[0].total, 0)
  assert.equal((await client.query('SELECT count(*)::int AS total FROM envios_cadastro WHERE email=$1', [failedEmail.email])).rows[0].total, 0)
  failMail = false
  const quotaInput = { ...input, apelido: 'quota-qa', email: 'quota@example.test' }
  for (let i = 0; i < 5; i++) {
    assert.equal((await request('/admin/cadastros', { method: 'POST', body: quotaInput })).status, 201)
    await client.query("UPDATE envios_cadastro SET enviado_em = enviado_em - interval '31 seconds' WHERE email=$1", [quotaInput.email])
  }
  const blocked = await request('/admin/cadastros', { method: 'POST', body: quotaInput })
  assert.equal(blocked.status, 429)
  assert.ok(blocked.body.retryAfterSeconds > 3000)
  assert.equal((await client.query('SELECT count(*)::int AS total FROM envios_cadastro WHERE email=$1', [quotaInput.email])).rows[0].total, 5)
  console.log(`Integração SQL aprovada: 5 tabelas temporárias, migrações idempotentes, galeria privada e limites persistidos; ${mails.length} e-mails simulados, nenhum real.`)
  if (process.argv.includes('--preview')) {
    await saveGalleryResult({ usuarioId: userId, fotoId: photoId, corteNome: 'Low Fade', previewUrl: `${base}/qa-preview.png` })
    await saveGalleryResult({ usuarioId: userId, fotoId: photoId, corteNome: 'Old Money' })
    console.log(`Prévia isolada pronta em ${base}; qa-user / Galeria-QA-2026 ou qa-admin / Galeria-QA-2026.`)
    await new Promise(resolve => { process.once('SIGINT', resolve); process.once('SIGTERM', resolve) })
  }
} finally {
  if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)) }
  await client.end()
  mock.restoreAll()
}
