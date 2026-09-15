import { pool } from '../database.js'

export async function findAllUsers() {
  const result = await pool.query(
    'SELECT id, nome, apelido, telefone, email, nivel_acesso, ativo, criado_em FROM usuarios ORDER BY id ASC'
  )
  return result.rows
}

export async function insertUser({ nome, apelido, telefone, email, senhaHash }) {
  const result = await pool.query(
    `INSERT INTO usuarios (nome, apelido, telefone, email, senha_hash)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, nome, apelido, telefone, email, nivel_acesso, ativo, criado_em`,
    [nome, apelido, telefone, email, senhaHash]
  )
  return result.rows[0]
}

export async function findUserByLogin(usernameOrEmail) {
  const result = await pool.query(
    `SELECT id, nome, apelido, email, senha_hash, nivel_acesso, ativo
     FROM usuarios
     WHERE apelido = $1 OR email = $1`,
    [usernameOrEmail]
  )
  return result.rows[0]
}

export async function findUserByEmail(email) {
  const result = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email])
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
    `UPDATE usuarios SET senha_hash = $1, token_redefinicao_senha = NULL, token_redefinicao_senha_expira = NULL WHERE id = $2`,
    [senhaHash, userId]
  )
}
