import { Router } from 'express'
import bcrypt from 'bcrypt'
import { pool } from '../database.js'

const router = Router()

// GET /api/usuarios — lista todos os usuários
router.get('/', async (req, res) => {
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

// POST /api/usuarios — cadastra um novo usuário
router.post('/', async (req, res) => {
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

export default router