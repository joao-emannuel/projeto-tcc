import { insertPhoto } from '../repositories/photosRepository.js'
import { ServiceError } from './serviceError.js'

const MAX_PHOTO_BYTES = 10 * 1024 * 1024
const PHOTO_SIGNATURES = {
  'image/png': Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  'image/jpeg': Buffer.from([0xff, 0xd8, 0xff]),
}

export async function savePhoto({ usuarioId, nomeOriginal, tipoMime, conteudo }) {
  if (typeof usuarioId !== 'string' || !/^[1-9]\d*$/.test(usuarioId) || Number(usuarioId) > 2147483647) {
    throw new ServiceError('Usuário inválido.', 400)
  }
  if (typeof nomeOriginal !== 'string' || !nomeOriginal.trim()) {
    throw new ServiceError('Informe o nome do arquivo.', 400)
  }
  const signature = Object.hasOwn(PHOTO_SIGNATURES, tipoMime) ? PHOTO_SIGNATURES[tipoMime] : undefined
  if (!signature) {
    throw new ServiceError('Selecione uma foto JPG ou PNG.', 415)
  }
  if (!Buffer.isBuffer(conteudo) || conteudo.length === 0) {
    throw new ServiceError('O arquivo está vazio.', 400)
  }
  if (conteudo.length > MAX_PHOTO_BYTES) {
    throw new ServiceError('A foto deve ter no máximo 10 MB.', 413)
  }
  if (!conteudo.subarray(0, signature.length).equals(signature)) {
    throw new ServiceError('O arquivo não corresponde ao formato JPG ou PNG informado.', 415)
  }

  try {
    return await insertPhoto({
      usuarioId: Number(usuarioId),
      nomeOriginal: nomeOriginal.trim(),
      tipoMime,
      conteudo,
    })
  } catch (err) {
    if (err.code === '23503') {
      throw new ServiceError('Usuário não encontrado.', 404)
    }
    throw err
  }
}
