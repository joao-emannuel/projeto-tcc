import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import bcrypt from 'bcrypt'
import { pool } from './database.js'

dotenv.config()

const app = express()

app.use(cors())
app.use(express.json())

app.get('/api/usuarios', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, nome, apelido, telefone, email, senha_hash, nivel_acesso, ativo, criado_em FROM usuarios ORDER BY id ASC'
    )
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao buscar usuários.' })
  }
})

app.post('/api/usuarios', async (req, res) => {
  const { nome, apelido, telefone, email, senha } = req.body
  try {
    const senha_hash = await bcrypt.hash(senha, 10)
    const result = await pool.query(
      `INSERT INTO usuarios (nome, apelido, telefone, email, senha_hash)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, nome, apelido, telefone, email, nivel_acesso, ativo, criado_em`,
      [nome, apelido, telefone, email, senha_hash]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error(err)
    if (err.code === '23505') {
      return res.status(409).json({ erro: 'Apelido já está em uso.' })
    }
    res.status(500).json({ erro: 'Erro ao criar usuário.' })
  }
})

app.post('/api/login', async (req, res) => {
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

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`)
})