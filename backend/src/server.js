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
    const result = await pool.query('SELECT * FROM usuarios ORDER BY id ASC')
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao buscar usuários.' })
  }
})

app.post('/api/usuarios', async (req, res) => {
  console.log(req.body)
  res.json({ mensagem: 'recebido' })
})

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`)
})