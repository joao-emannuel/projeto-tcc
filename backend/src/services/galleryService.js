import { listResults, findResult, updateFavorite, deleteResult, insertResult } from '../repositories/galleryRepository.js'
import { ServiceError } from './serviceError.js'

function positiveId(value) {
  if (!/^[1-9]\d*$/.test(String(value)) || Number(value) > 2147483647) {
    throw new ServiceError('Identificador inválido.', 400)
  }
  return Number(value)
}

function publicResult(row) {
  if (!row) throw new ServiceError('Resultado não encontrado na sua galeria.', 404)
  return { id: row.id, corteNome: row.corte_nome, criadoEm: row.criado_em, favorito: row.favorito, previewUrl: row.preview_url }
}

export async function getGallery(usuarioId) {
  return { resultados: (await listResults(usuarioId)).map(publicResult) }
}

export async function getGalleryResult(usuarioId, id) {
  return { resultado: publicResult(await findResult(usuarioId, positiveId(id))) }
}

export async function setGalleryFavorite(usuarioId, id, body = {}) {
  id = positiveId(id)
  const favorito = body?.favorito
  if (typeof favorito !== 'boolean') throw new ServiceError('Informe se o resultado é favorito.', 400)
  return { resultado: publicResult(await updateFavorite(usuarioId, id, favorito)) }
}

export async function removeGalleryResult(usuarioId, id) {
  if (!await deleteResult(usuarioId, positiveId(id))) {
    throw new ServiceError('Resultado não encontrado na sua galeria.', 404)
  }
  return { mensagem: 'Resultado excluído da galeria.' }
}

// Uso interno pela futura integração. Não expõe criação de simulações sem processamento pela API.
export async function saveGalleryResult({ usuarioId, fotoId, corteNome, previewUrl = null }) {
  usuarioId = positiveId(usuarioId)
  fotoId = positiveId(fotoId)
  if (typeof corteNome !== 'string' || !corteNome.trim() || corteNome.trim().length > 100) {
    throw new ServiceError('Informe o nome do corte.', 400)
  }
  if (previewUrl !== null && (typeof previewUrl !== 'string' || previewUrl.length > 2048
    || !/^(https?:\/\/[^\s]+|\/(?!\/)[^\s]*)$/.test(previewUrl))) {
    throw new ServiceError('Endereço da prévia inválido.', 400)
  }
  const row = await insertResult({ usuarioId, fotoId, corteNome: corteNome.trim(), previewUrl })
  if (!row) throw new ServiceError('Foto não encontrada para este usuário.', 404)
  return { resultado: publicResult(row) }
}
