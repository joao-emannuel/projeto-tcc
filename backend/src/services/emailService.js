import { Resend } from 'resend'
import { config } from '../config.js'
import { ServiceError } from './serviceError.js'

let resend

async function sendEmail(message) {
  resend ??= new Resend(config.email.apiKey)
  const response = await resend.emails.send({ from: config.email.from, ...message })
  if (response.error) throw new ServiceError('Não foi possível enviar o e-mail. Tente novamente.', 502)
  return response
}

export async function sendPasswordResetEmail(email, link) {
  return sendEmail({
    from: config.email.from,
    to: email,
    subject: 'Redefinição de senha',
    html: `<p>Clique no link para redefinir sua senha: <a href="${link}">${link}</a></p><p>Este link expira em 30 minutos.</p>`,
  })
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character])
}

export async function sendRegistrationEmail({ email, nome, apelido, codigo, senhaInicial }) {
  return sendEmail({
    to: email,
    subject: 'Confirme seu cadastro no VisionFade',
    html: `<h2>Seu cadastro no VisionFade</h2><p>Olá, ${escapeHtml(nome)}!</p>
      <p>Envie este código ao administrador pelo WhatsApp para confirmar seu cadastro:</p>
      <p style="font-size:28px;letter-spacing:5px"><strong>${codigo}</strong></p>
      <p>O código expira em 30 minutos. A conta só será criada após a confirmação pelo administrador.</p>
      <p>Após a confirmação, entre com o apelido <strong>${escapeHtml(apelido)}</strong> ou seu e-mail e a senha inicial:</p>
      <p><strong>${senhaInicial}</strong></p>
      <p>Envie apenas o código ao administrador; guarde a senha para você.</p>
      <p>Você poderá definir sua própria senha no primeiro login ou continuar com a senha inicial. Se receber um novo código, utilize a senha do e-mail mais recente.</p>`,
  })
}
