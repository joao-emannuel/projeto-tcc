import { pool } from '../database.js'

export async function insertPhoto({ usuarioId, nomeOriginal, tipoMime, conteudo }) {
  const result = await pool.query(
    `INSERT INTO fotos (usuario_id, nome_original, tipo_mime, tamanho_bytes, conteudo)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, usuario_id, nome_original, tipo_mime, tamanho_bytes, criado_em`,
    [usuarioId, nomeOriginal, tipoMime, conteudo.length, conteudo]
  )
  return result.rows[0]
}
