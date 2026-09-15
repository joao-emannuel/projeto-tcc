import bcrypt from 'bcrypt'
import crypto from 'node:crypto'
import { config } from '../config.js'
import {
  findUserByEmail,
  findUserByPasswordResetToken,
  savePasswordResetToken,
  updatePasswordAndClearToken,
} from '../repositories/usersRepository.js'
import { sendPasswordResetEmail } from './emailService.js'
import { ServiceError } from './serviceError.js'

const resetTokenLifetime = 30 * 60 * 1000
const resetRequestMessage = 'Se o e-mail existir, enviaremos as instruções.'

export async function requestPasswordReset({ email } = {}) {
  if (!email) {
    throw new ServiceError('Parâmetros inválidos.', 400)
  }

  const usuario = await findUserByEmail(email)
  if (usuario) {
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + resetTokenLifetime)

    await savePasswordResetToken(usuario.id, token, expiresAt)

    const link = `${config.frontendUrl}/redefinir-senha?token=${token}`
    await sendPasswordResetEmail(email, link)
  }

  return { mensagem: resetRequestMessage }
}

export async function resetPassword({ token, novaSenha } = {}) {
  if (!token || !novaSenha) {
    throw new ServiceError('Parâmetros inválidos.', 400)
  }

  const usuario = await findUserByPasswordResetToken(token)
  if (!usuario || new Date(usuario.token_redefinicao_senha_expira) < new Date()) {
    throw new ServiceError('Token inválido ou expirado.', 400)
  }

  const senhaHash = await bcrypt.hash(novaSenha, 10)
  await updatePasswordAndClearToken(usuario.id, senhaHash)

  return { mensagem: 'Senha redefinida com sucesso.' }
}
