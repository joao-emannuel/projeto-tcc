import { Router } from 'express'
import bcrypt from 'bcrypt'
import { pool } from '../database.js'

const router = Router()

// POST /api/login
router.post('/', async (req, res) => {
  const { usernameOrEmail, senha } = req.body

  if (!usernameOrEmail || !senha) {
    return res.status(400).json({ erro: 'Parâmetros inválidos.' })
  }

  try {
    const result = await pool.query(
      `SELECT id, nome, apelido, email, senha_hash, nivel_acesso, ativo
       FROM usuarios
       WHERE apelido = $1 OR email = $1`,
      [usernameOrEmail]
    )

    const usuario = result.rows[0]

    if (!usuario) {
      return res.status(401).json({ erro: 'Usuário ou senha incorretos.' })
    }

    if (!usuario.ativo) {
      return res.status(403).json({ erro: 'Usuário desativado.' })
    }

    const senhaCorreta = await bcrypt.compare(senha, usuario.senha_hash)

    if (!senhaCorreta) {
      return res.status(401).json({ erro: 'Usuário ou senha incorretos.' })
    }

    const { senha_hash, ...usuarioSemSenha } = usuario
    res.json(usuarioSemSenha)

  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao fazer login.' })
  }
})

export default router