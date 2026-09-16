import assert from 'node:assert/strict'
import { mock } from 'node:test'
import { readFile } from 'node:fs/promises'
import pg from 'pg'
import bcrypt from 'bcrypt'
import { config } from '../src/config.js'

const client = new pg.Client(config.database)
const mails = []
let server
try {
  await client.connect()
  await client.query(`CREATE TEMP TABLE usuarios (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome TEXT NOT NULL, apelido TEXT NOT NULL UNIQUE, telefone TEXT NOT NULL,
    email TEXT NOT NULL, senha_hash TEXT NOT NULL, nivel_acesso TEXT NOT NULL DEFAULT 'usuario',
    ativo BOOLEAN NOT NULL DEFAULT true, criado_em TIMESTAMP NOT NULL DEFAULT now(),
    token_redefinicao_senha TEXT, token_redefinicao_senha_expira TIMESTAMP
  )`)
  for (const file of ['001_create_fotos.sql', '002_admin_cadastros.sql']) {
    const sql = await readFile(new URL(`../src/migrations/${file}`, import.meta.url), 'utf8')
    await client.query(sql.replaceAll('CREATE TABLE IF NOT EXISTS', 'CREATE TEMP TABLE'))
  }
  const tables = await client.query(`SELECT c.relname FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.oid = pg_my_temp_schema() AND c.relname IN ('usuarios', 'fotos', 'cadastros_pendentes')`)
  assert.equal(tables.rows.length, 3)
  const query = client.query.bind(client)
  mock.module('../src/database.js', { namedExports: { pool: { query, connect: async () => ({ query, release() {} }) } } })
  mock.module('resend', { namedExports: { Resend: class { emails = { send: async message => {
    mails.push(message)
    return { data: { id: 'mock-only' }, error: null }
  } } } } })
  const { default: app } = await import('../src/app.js')
  server = app.listen(0, '127.0.0.1')
  await new Promise(resolve => server.once('listening', resolve))
  const base = `http://127.0.0.1:${server.address().port}/api`
  async function request(path, body, token, method = body === undefined ? 'GET' : 'POST') {
    const response = await fetch(`${base}${path}`, {
      method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
    return { status: response.status, body: await response.json() }
  }
  function emailCredentials(message) {
    return {
      codigo: /<strong>(\d{6})<\/strong>/.exec(message.html)[1],
      senha: /<p><strong>([^<]+)<\/strong><\/p>/.exec(message.html)[1],
    }
  }

  await query(`INSERT INTO usuarios (nome, apelido, telefone, email, senha_hash, nivel_acesso)
    VALUES ('Admin teste', 'admin-teste', '', 'admin@example.test', $1, 'admin')`, [await bcrypt.hash('admin-synthetic-pass', 10)])
  const loginAdmin = await request('/login', { usernameOrEmail: 'admin-teste', senha: 'admin-synthetic-pass' })
  assert.equal(loginAdmin.status, 200)
  assert.equal(loginAdmin.body.troca_senha_pendente, false)
  const adminToken = loginAdmin.body.sessionToken
  const pending = await request('/admin/cadastros', {
    nome: 'Usuário fictício', apelido: 'user-teste', telefone: '', email: 'user@example.test', nivel_acesso: 'usuario',
  }, adminToken)
  assert.equal(pending.status, 201)
  assert.equal((await query('SELECT count(*)::integer AS total FROM usuarios')).rows[0].total, 1)
  const firstCredentials = emailCredentials(mails.at(-1))
  const path = `/admin/cadastros/${pending.body.cadastroId}`
  assert.equal((await request(`${path}/reenviar`, {}, adminToken)).status, 200)
  const credentials = emailCredentials(mails.at(-1))
  assert.notEqual(credentials.codigo, firstCredentials.codigo)
  assert.notEqual(credentials.senha, firstCredentials.senha)
  assert.equal((await request(`${path}/confirmar`, { codigo: firstCredentials.codigo }, adminToken)).status, 400)
  const confirm = await request(`${path}/confirmar`, { codigo: credentials.codigo }, adminToken)
  assert.equal(confirm.status, 201)
  const userId = confirm.body.usuario.id
  assert.equal(confirm.body.usuario.troca_senha_pendente, true)
  assert.equal((await request(`${path}/confirmar`, { codigo: credentials.codigo }, adminToken)).status, 404)
  assert.equal((await query('SELECT count(*)::integer AS total FROM usuarios')).rows[0].total, 2)
  assert.equal((await query('SELECT count(*)::integer AS total FROM cadastros_pendentes')).rows[0].total, 0)
  const userLogin = await request('/login', { usernameOrEmail: 'user-teste', senha: credentials.senha })
  assert.equal(userLogin.status, 200)
  assert.equal(userLogin.body.troca_senha_pendente, true)
  const userToken = userLogin.body.sessionToken
  assert.equal((await request('/admin/usuarios', undefined, userToken)).status, 403)
  const defer = await request('/conta/adiar-senha', {}, userToken)
  assert.equal(defer.status, 200)
  assert.equal(defer.body.usuario.troca_senha_pendente, false)
  const newPassword = 'new-synthetic-pass'
  const change = await request('/conta/senha', { novaSenha: newPassword, confirmarSenha: newPassword }, userToken)
  assert.equal(change.status, 200)
  assert.equal((await request('/login', { usernameOrEmail: 'user-teste', senha: credentials.senha })).status, 401)
  const secondLogin = await request('/login', { usernameOrEmail: 'user-teste', senha: newPassword })
  assert.equal(secondLogin.status, 200)
  assert.equal(secondLogin.body.troca_senha_pendente, false)
  assert.equal((await request(`/admin/usuarios/${userId}`, { nome: 'Nome editado', ativo: false }, adminToken, 'PATCH')).status, 200)
  assert.equal((await request('/conta', undefined, secondLogin.body.sessionToken)).status, 401)
  assert.equal((await request(`/admin/usuarios/${userId}`, { ativo: true }, adminToken, 'PATCH')).status, 200)
  assert.equal((await request(`/admin/usuarios/${userId}/recuperar-senha`, {}, adminToken)).status, 200)
  assert.equal(mails.at(-1).to, 'user@example.test')
  assert.equal((await request('/admin/usuarios', undefined, adminToken)).body.length, 2)
  assert.equal((await request('/admin/usuarios/1', { ativo: false }, adminToken, 'PATCH')).status, 400)
  assert.equal((await request('/logout', {}, adminToken)).status, 200)
  assert.equal((await request('/admin/usuarios', undefined, adminToken)).status, 401)
  console.log('SQL real validado em 3 tabelas temporárias: cadastro/reenvio/confirmação/login/primeiro acesso/edição/permissões/logout; 3 e-mails capturados por mock, nenhum envio real.')
} finally {
  if (server) await new Promise(resolve => server.close(resolve))
  await client.end()
  mock.restoreAll()
}
