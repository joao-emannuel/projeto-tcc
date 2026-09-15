import bcrypt from 'bcrypt'
import { findUserByLogin } from '../repositories/usersRepository.js'
import { ServiceError } from './serviceError.js'

export async function login({ usernameOrEmail, senha } = {}) {
  if (!usernameOrEmail || !senha) {
    throw new ServiceError('Parâmetros inválidos.', 400)
  }

  const usuario = await findUserByLogin(usernameOrEmail)

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

  const { senha_hash, ...usuarioSemSenha } = usuario
  return usuarioSemSenha
}
