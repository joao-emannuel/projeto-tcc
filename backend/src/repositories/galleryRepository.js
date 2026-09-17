import { pool } from '../database.js'

const fields = 'id, corte_nome, criado_em, favorito, preview_url'

export async function listResults(usuarioId) {
  const { rows } = await pool.query(
    `SELECT ${fields} FROM resultados WHERE usuario_id = $1 ORDER BY criado_em DESC, id DESC`,
    [usuarioId]
  )
  return rows
}

export async function findResult(usuarioId, id) {
  const { rows } = await pool.query(
    `SELECT ${fields} FROM resultados WHERE id = $1 AND usuario_id = $2`, [id, usuarioId]
  )
  return rows[0]
}

export async function updateFavorite(usuarioId, id, favorito) {
  const { rows } = await pool.query(
    `UPDATE resultados SET favorito = $1 WHERE id = $2 AND usuario_id = $3 RETURNING ${fields}`,
    [favorito, id, usuarioId]
  )
  return rows[0]
}

export async function deleteResult(usuarioId, id) {
  const { rows } = await pool.query(
    'DELETE FROM resultados WHERE id = $1 AND usuario_id = $2 RETURNING id', [id, usuarioId]
  )
  return rows[0]
}

// Ponto de gravação para o futuro processamento de IA. O upload sozinho não cria um resultado.
export async function insertResult({ usuarioId, fotoId, corteNome, previewUrl }) {
  const { rows } = await pool.query(
    `INSERT INTO resultados (usuario_id, foto_id, corte_nome, preview_url)
     SELECT $1, id, $3, $4 FROM fotos WHERE id = $2 AND usuario_id = $1
     RETURNING ${fields}`,
    [usuarioId, fotoId, corteNome, previewUrl]
  )
  return rows[0]
}
