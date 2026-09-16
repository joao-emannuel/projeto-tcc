import bcrypt from 'bcrypt'
import { dismissPasswordPrompt, updatePasswordAndClearToken, findUserById } from '../repositories/usersRepository.js'
import { publicUser } from './sessionService.js'
import { ServiceError } from './serviceError.js'

export async function changeOwnPassword(usuario, { novaSenha, confirmarSenha } = {}) {
  if (typeof novaSenha !== 'string' || novaSenha.length < 8 || Buffer.byteLength(novaSenha) > 72) {
    throw new ServiceError('A senha deve ter pelo menos 8 caracteres e no máximo 72 bytes.', 400)
  }
  if (novaSenha !== confirmarSenha) throw new ServiceError('As senhas não coincidem.', 400)
  await updatePasswordAndClearToken(usuario.id, await bcrypt.hash(novaSenha, 10))
  return { usuario: publicUser(await findUserById(usuario.id)), mensagem: 'Senha atualizada com sucesso.' }
}

export async function deferOwnPassword(usuario) {
  await dismissPasswordPrompt(usuario.id)
  return { usuario: { ...usuario, troca_senha_pendente: false }, mensagem: 'Você pode redefinir sua senha depois pela recuperação de senha.' }
}
