import { apiRequest } from './api.js'

const maxPhotoSize = 10 * 1024 * 1024
const allowedTypes = ['image/jpeg', 'image/png']

export async function uploadPhoto(file, usuarioId) {
  if (!file || !allowedTypes.includes(file.type)) {
    throw new Error('Selecione uma foto JPG ou PNG.')
  }
  if (file.size === 0) {
    throw new Error('O arquivo selecionado está vazio.')
  }
  if (file.size > maxPhotoSize) {
    throw new Error('A foto deve ter no máximo 10 MB.')
  }
  if (!Number.isSafeInteger(usuarioId) || usuarioId <= 0) {
    throw new Error('Faça login novamente para enviar uma foto.')
  }

  const query = new URLSearchParams({ usuarioId: String(usuarioId), nome: file.name })
  return apiRequest(`/fotos?${query}`, {
    method: 'POST',
    body: file,
    fallbackMessage: 'Não foi possível salvar a foto. Tente novamente.'
  })
}
