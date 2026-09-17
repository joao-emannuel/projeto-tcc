import crypto from 'node:crypto'
import bcrypt from 'bcrypt'
import {
  adminTransaction, checkUserConflict, insertPending, getPending, updatePendingCredentials,
  createConfirmedUser, getUserForEdit, countActiveAdmins, updateUser,
  incrementIncorrectAttempts, getRecentRegistrationSends, recordRegistrationSend,
} from '../repositories/adminRepository.js'
import { sendRegistrationEmail } from './emailService.js'
import { isAdmin, publicUser } from './sessionService.js'
import { ServiceError } from './serviceError.js'

function textField(value, label, max = 150) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) {
    throw new ServiceError(`Informe ${label} válido.`, 400)
  }
  return value.trim()
}

function fields(body = {}) {
  const nome = textField(body.nome, 'um nome')
  const apelido = textField(body.apelido, 'um apelido', 60)
  const telefone = typeof body.telefone === 'string' ? body.telefone.trim() : ''
  const nivel_acesso = body.nivel_acesso ?? 'usuario'
  if (!['usuario', 'admin'].includes(nivel_acesso)) throw new ServiceError('Perfil de acesso inválido.', 400)
  if (telefone && (telefone.length > 30 || telefone.replace(/\D/g, '').length < 8)) throw new ServiceError('Informe um telefone válido.', 400)
  return { nome, apelido, telefone, nivel_acesso }
}

function pendingId(id) {
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id ?? '')) {
    throw new ServiceError('Cadastro pendente inválido.', 400)
  }
}

function userId(id) {
  const parsed = Number(id)
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 2147483647) throw new ServiceError('Usuário inválido.', 400)
  return parsed
}

function hashCode(code) {
  return crypto.createHash('sha256').update(code).digest('hex')
}

async function newCredentials() {
  const codigo = String(crypto.randomInt(0, 1000000)).padStart(6, '0')
  const senhaInicial = crypto.randomBytes(12).toString('base64url')
  return {
    codigo, senhaInicial,
    senha_hash: await bcrypt.hash(senhaInicial, 10),
    codigo_hash: hashCode(codigo),
    expira_em: new Date(Date.now() + 30 * 60 * 1000),
  }
}

const resendInterval = 30 * 1000
const sendWindow = 60 * 60 * 1000
const maxSends = 5
const maxIncorrectAttempts = 5

function nextSendAt(sends) {
  return Math.max((sends.at(-1) ?? 0) + resendInterval, sends.length >= maxSends ? sends[0] + sendWindow : 0)
}

async function checkSendLimit(client, cadastro) {
  const now = Date.now()
  const sends = await getRecentRegistrationSends(client, cadastro.administrador_id, cadastro.email, new Date(now - sendWindow))
  const availableAt = nextSendAt(sends)
  if (sends.length && availableAt > now) {
    throw Object.assign(new ServiceError(
      sends.length >= maxSends
        ? 'Limite de 5 envios por hora para este e-mail atingido. Aguarde para enviar novamente.'
        : 'Aguarde 30 segundos entre os envios de verificação para este e-mail.',
      429
    ), { retryAfterSeconds: Math.ceil((availableAt - now) / 1000), reenviarEm: new Date(availableAt).toISOString() })
  }
  return sends
}

async function sendVerification(client, cadastro, sends) {
  await sendRegistrationEmail(cadastro)
  const sentAt = new Date(Date.now())
  await recordRegistrationSend(client, cadastro, sentAt)
  return {
    cadastroId: cadastro.id, email: cadastro.email, expiraEm: cadastro.expira_em,
    reenviarEm: new Date(nextSendAt([...sends, sentAt.getTime()])).toISOString(),
  }
}

function blockedCodeError() {
  return Object.assign(new ServiceError('Limite de 5 tentativas atingido. Reenvie a verificação para receber um novo código.', 429), {
    codigoBloqueado: true, tentativasRestantes: 0,
  })
}

export async function beginRegistration(admin, body = {}) {
  const input = fields(body)
  const email = textField(body.email, 'um e-mail', 254).toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ServiceError('Informe um e-mail válido.', 400)
  const credentials = await newCredentials()
  const cadastro = { ...input, ...credentials, email, id: crypto.randomUUID(), administrador_id: admin.id }
  return adminTransaction(async client => {
    await checkUserConflict(client, cadastro)
    const sends = await checkSendLimit(client, cadastro)
    await insertPending(client, cadastro)
    return sendVerification(client, cadastro, sends)
  })
}

export async function resendRegistration(admin, id) {
  pendingId(id)
  return adminTransaction(async client => {
    const previous = await getPending(client, id, admin.id)
    const sends = await checkSendLimit(client, previous)
    let credentials = await newCredentials()
    while (credentials.codigo_hash === previous.codigo_hash) credentials = await newCredentials()
    const cadastro = { ...previous, ...credentials }
    await checkUserConflict(client, cadastro)
    await updatePendingCredentials(client, cadastro)
    return sendVerification(client, cadastro, sends)
  })
}

export async function confirmRegistration(admin, id, { codigo } = {}) {
  pendingId(id)
  if (typeof codigo !== 'string' || !/^\d{6}$/.test(codigo.trim())) throw new ServiceError('Informe o código de 6 dígitos.', 400)
  const result = await adminTransaction(async client => {
    const cadastro = await getPending(client, id, admin.id)
    if (cadastro.tentativas_incorretas >= maxIncorrectAttempts) throw blockedCodeError()
    if (new Date(cadastro.expira_em).getTime() <= Date.now()) throw new ServiceError('Código expirado. Reenvie a verificação.', 400)
    if (hashCode(codigo.trim()) !== cadastro.codigo_hash) {
      const attempts = await incrementIncorrectAttempts(client, id)
      // Retorna o erro para confirmar o contador antes de responder à requisição.
      return { error: attempts >= maxIncorrectAttempts ? blockedCodeError() : Object.assign(
        new ServiceError('Código incorreto. Confira o código recebido por e-mail.', 400),
        { tentativasRestantes: maxIncorrectAttempts - attempts }
      ) }
    }
    await checkUserConflict(client, cadastro)
    return { usuario: publicUser(await createConfirmedUser(client, cadastro)) }
  })
  if (result.error) throw result.error
  return result
}

export async function editUser(admin, id, body = {}) {
  id = userId(id)
  return adminTransaction(async client => {
    const current = await getUserForEdit(client, id)
    if (body.email !== undefined && body.email !== current.email) throw new ServiceError('O e-mail verificado não pode ser alterado por esta edição.', 400)
    const input = fields({ ...current, nivel_acesso: isAdmin(current) ? 'admin' : 'usuario', ...body })
    const ativo = body.ativo ?? current.ativo
    if (typeof ativo !== 'boolean') throw new ServiceError('Status de usuário inválido.', 400)
    if (id === admin.id && (!ativo || input.nivel_acesso !== 'admin')) {
      throw new ServiceError('Você não pode desativar ou remover o acesso administrativo da própria conta.', 400)
    }
    if (current.ativo && isAdmin(current) && (!ativo || input.nivel_acesso !== 'admin') && await countActiveAdmins(client) <= 1) {
      throw new ServiceError('Mantenha pelo menos um administrador ativo.', 400)
    }
    await checkUserConflict(client, { ...input, email: current.email, exceptId: id })
    return { usuario: publicUser(await updateUser(client, id, { ...input, ativo })) }
  })
}
