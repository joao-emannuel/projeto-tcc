import bcrypt from 'bcrypt'
import { findUserByLogin } from '../repositories/usersRepository.js'
import { ServiceError } from './serviceError.js'
import { createSession, publicUser } from './sessionService.js'

export async function login({ usernameOrEmail, senha } = {}) {
  if (typeof usernameOrEmail !== 'string' || !usernameOrEmail.trim() || typeof senha !== 'string' || !senha) {
    throw new ServiceError('Parâmetros inválidos.', 400)
  }

  const usuario = await findUserByLogin(usernameOrEmail.trim())

  if (!usuario) {
    throw new ServiceError('Usuário ou senha incorretos.', 401)
  }

  if (!usuario.ativo) {
    throw new ServiceError('Usuário desativado.', 403)
  }

  const senhaCorreta = await bcrypt.compare(senha, usuario.senha_hash)
  if (!senhaCorreta) {
    throw new ServiceError('Usuário ou senha incorretos.', 401)
  }

  return { ...publicUser(usuario), sessionToken: createSession(usuario.id) }
}
