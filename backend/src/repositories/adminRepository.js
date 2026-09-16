import { pool } from '../database.js'
import { ServiceError } from '../services/serviceError.js'

export const publicFields = 'id, nome, apelido, telefone, email, nivel_acesso, ativo, criado_em, troca_senha_pendente'

export async function adminTransaction(action) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    // Serializa cadastro e edição para impedir duplicados e a remoção simultânea dos administradores.
    await client.query('SELECT pg_advisory_xact_lock(846310)')
    const result = await action(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK')
    if (err.code === '23505') throw new ServiceError('Apelido ou e-mail já está em uso.', 409)
    throw err
  } finally {
    client.release()
  }
}

export async function checkUserConflict(client, { apelido, email, exceptId = null }) {
  const result = await client.query(
    'SELECT id FROM usuarios WHERE (lower(apelido) = lower($1) OR lower(email) = lower($2)) AND ($3::integer IS NULL OR id <> $3)',
    [apelido, email, exceptId]
  )
  if (result.rows.length) throw new ServiceError('Apelido ou e-mail já está em uso.', 409)
}

export async function insertPending(client, cadastro) {
  await client.query(
    `INSERT INTO cadastros_pendentes (id, administrador_id, nome, apelido, telefone, email, nivel_acesso, senha_hash, codigo_hash, expira_em)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [cadastro.id, cadastro.administrador_id, cadastro.nome, cadastro.apelido, cadastro.telefone, cadastro.email,
      cadastro.nivel_acesso, cadastro.senha_hash, cadastro.codigo_hash, cadastro.expira_em]
  )
}

export async function getPending(client, id, adminId) {
  const result = await client.query(
    'SELECT * FROM cadastros_pendentes WHERE id = $1 AND administrador_id = $2 FOR UPDATE',
    [id, adminId]
  )
  if (!result.rows[0]) throw new ServiceError('Cadastro pendente não encontrado. Inicie um novo cadastro.', 404)
  return result.rows[0]
}

export async function updatePendingCredentials(client, cadastro) {
  await client.query(
    'UPDATE cadastros_pendentes SET senha_hash = $1, codigo_hash = $2, expira_em = $3 WHERE id = $4',
    [cadastro.senha_hash, cadastro.codigo_hash, cadastro.expira_em, cadastro.id]
  )
}

export async function createConfirmedUser(client, cadastro) {
  const result = await client.query(
    `INSERT INTO usuarios (nome, apelido, telefone, email, nivel_acesso, senha_hash, troca_senha_pendente)
     VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING ${publicFields}`,
    [cadastro.nome, cadastro.apelido, cadastro.telefone, cadastro.email, cadastro.nivel_acesso, cadastro.senha_hash]
  )
  await client.query('DELETE FROM cadastros_pendentes WHERE id = $1', [cadastro.id])
  return result.rows[0]
}

export async function getUserForEdit(client, id) {
  const result = await client.query(`SELECT ${publicFields} FROM usuarios WHERE id = $1 FOR UPDATE`, [id])
  if (!result.rows[0]) throw new ServiceError('Usuário não encontrado.', 404)
  return result.rows[0]
}

export async function countActiveAdmins(client) {
  const result = await client.query("SELECT count(*)::integer AS total FROM usuarios WHERE ativo = true AND nivel_acesso IN ('admin', 'administrador')")
  return result.rows[0].total
}

export async function updateUser(client, id, usuario) {
  const result = await client.query(
    `UPDATE usuarios SET nome = $1, apelido = $2, telefone = $3, nivel_acesso = $4, ativo = $5
     WHERE id = $6 RETURNING ${publicFields}`,
    [usuario.nome, usuario.apelido, usuario.telefone, usuario.nivel_acesso, usuario.ativo, id]
  )
  return result.rows[0]
}
