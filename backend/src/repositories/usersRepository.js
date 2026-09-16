import { pool } from '../database.js'

export async function findAllUsers() {
  const result = await pool.query(
    'SELECT id, nome, apelido, telefone, email, nivel_acesso, ativo, criado_em, troca_senha_pendente FROM usuarios ORDER BY id ASC'
  )
  return result.rows
}

export async function findUserByLogin(usernameOrEmail) {
  const result = await pool.query(
    `SELECT id, nome, apelido, telefone, email, senha_hash, nivel_acesso, ativo, criado_em, troca_senha_pendente
     FROM usuarios
     WHERE lower(apelido) = lower($1) OR lower(email) = lower($1)`,
    [usernameOrEmail]
  )
  return result.rows[0]
}

export async function findUserByEmail(email) {
  const result = await pool.query('SELECT id FROM usuarios WHERE lower(email) = lower($1)', [email])
  return result.rows[0]
}

export async function savePasswordResetToken(userId, token, expiresAt) {
  await pool.query(
    `UPDATE usuarios SET token_redefinicao_senha = $1, token_redefinicao_senha_expira = $2 WHERE id = $3`,
    [token, expiresAt, userId]
  )
}

export async function findUserByPasswordResetToken(token) {
  const result = await pool.query(
    `SELECT id, token_redefinicao_senha_expira FROM usuarios WHERE token_redefinicao_senha = $1`,
    [token]
  )
  return result.rows[0]
}

export async function updatePasswordAndClearToken(userId, senhaHash) {
  await pool.query(
    `UPDATE usuarios SET senha_hash = $1, token_redefinicao_senha = NULL, token_redefinicao_senha_expira = NULL, troca_senha_pendente = false WHERE id = $2`,
    [senhaHash, userId]
  )
}

export async function findUserById(userId) {
  const result = await pool.query(
    'SELECT id, nome, apelido, telefone, email, nivel_acesso, ativo, criado_em, troca_senha_pendente FROM usuarios WHERE id = $1',
    [userId]
  )
  return result.rows[0]
}

export async function dismissPasswordPrompt(userId) {
  await pool.query('UPDATE usuarios SET troca_senha_pendente = false WHERE id = $1', [userId])
}
