import { Resend } from 'resend'
import { config } from '../config.js'

let resend

export async function sendPasswordResetEmail(email, link) {
  resend ??= new Resend(config.email.apiKey)

  return resend.emails.send({
    from: config.email.from,
    to: email,
    subject: 'Redefinição de senha',
    html: `<p>Clique no link para redefinir sua senha: <a href="${link}">${link}</a></p><p>Este link expira em 30 minutos.</p>`,
  })
}
