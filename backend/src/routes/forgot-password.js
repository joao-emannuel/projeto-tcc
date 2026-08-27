import { Router } from 'express'
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { Resend } from 'resend'
import { pool } from '../database.js'

const router = Router()
const resend = new Resend(process.env.RESEND_API_KEY)

// POST /api/esqueci-senha
router.post('/esqueci-senha', async (req, res) => {
  const { email } = req.body
  console.log('Recebido pedido de recuperação para:', email)

  if (!email) {
    return res.status(400).json({ erro: 'Parâmetros inválidos.' })
  }

  try {
    const result = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email])
    const usuario = result.rows[0]

    console.log('Usuário encontrado?', usuario)

    // sempre responde OK, mesmo se o e-mail não existir
    // (evita que alguém descubra quais e-mails estão cadastrados)
    if (!usuario) {
      return res.json({ mensagem: 'Se o e-mail existir, enviaremos as instruções.' })
    }

    const token = crypto.randomBytes(32).toString('hex')
    const expira = new Date(Date.now() + 30 * 60 * 1000) // 30 minutos

    await pool.query(
      `UPDATE usuarios SET token_redefinicao_senha = $1, token_redefinicao_senha_expira = $2 WHERE id = $3`,
      [token, expira, usuario.id]
    )

    const link = `http://localhost:5173/redefinir-senha?token=${token}`

    await resend.emails.send({
      from: 'naoresponda@visionfade.com.br',
      to: email,
      subject: 'Redefinição de senha',
      html: `<p>Clique no link para redefinir sua senha: <a href="${link}">${link}</a></p><p>Este link expira em 30 minutos.</p>`
    })

    res.json({ mensagem: 'Se o e-mail existir, enviaremos as instruções.' })

  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao processar solicitação.' })
  }
})

// POST /api/redefinir-senha
router.post('/redefinir-senha', async (req, res) => {
  const { token, novaSenha } = req.body

  if (!token || !novaSenha) {
    return res.status(400).json({ erro: 'Parâmetros inválidos.' })
  }

  try {
    const result = await pool.query(
      `SELECT id, token_redefinicao_senha_expira FROM usuarios WHERE token_redefinicao_senha = $1`,
      [token]
    )
    const usuario = result.rows[0]

    if (!usuario || new Date(usuario.token_redefinicao_senha_expira) < new Date()) {
      return res.status(400).json({ erro: 'Token inválido ou expirado.' })
    }

    const senha_hash = await bcrypt.hash(novaSenha, 10)

    await pool.query(
      `UPDATE usuarios SET senha_hash = $1, token_redefinicao_senha = NULL, token_redefinicao_senha_expira = NULL WHERE id = $2`,
      [senha_hash, usuario.id]
    )

    res.json({ mensagem: 'Senha redefinida com sucesso.' })

  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao redefinir senha.' })
  }
})

export default router