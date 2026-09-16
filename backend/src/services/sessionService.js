import crypto from 'node:crypto'
import { findUserById } from '../repositories/usersRepository.js'
import { ServiceError } from './serviceError.js'

const sessions = new Map()
const lifetime = 8 * 60 * 60 * 1000

export function isAdmin(usuario) {
  return ['admin', 'administrador'].includes(usuario?.nivel_acesso)
}

export function publicUser(usuario) {
  const fields = ['id', 'nome', 'apelido', 'telefone', 'email', 'nivel_acesso', 'ativo', 'criado_em']
  return {
    ...Object.fromEntries(fields.filter(field => usuario[field] !== undefined).map(field => [field, usuario[field]])),
    troca_senha_pendente: Boolean(usuario.troca_senha_pendente),
  }
}

export function createSession(userId) {
  for (const [token, session] of sessions) {
    if (session.expiresAt <= Date.now()) sessions.delete(token)
  }
  const token = crypto.randomBytes(32).toString('hex')
  sessions.set(token, { userId, expiresAt: Date.now() + lifetime })
  return token
}

export function revokeSession(token) {
  sessions.delete(token)
}

export async function authenticate(authorization = '') {
  const token = /^Bearer ([a-f0-9]{64})$/.exec(authorization)?.[1]
  const session = sessions.get(token)
  if (!session || session.expiresAt <= Date.now()) {
    sessions.delete(token)
    throw new ServiceError('Sua sessão expirou. Entre novamente.', 401)
  }
  const usuario = await findUserById(session.userId)
  if (!usuario || !usuario.ativo) {
    sessions.delete(token)
    throw new ServiceError('Sua conta está desativada ou indisponível.', 401)
  }
  return { usuario: publicUser(usuario), token }
}
