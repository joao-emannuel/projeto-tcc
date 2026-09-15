import { Router } from 'express'
import { createUser, listUsers } from '../services/usersService.js'
import { ServiceError } from '../services/serviceError.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    res.json(await listUsers())
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao buscar usuários.' })
  }
})

router.post('/', async (req, res) => {
  try {
    res.status(201).json(await createUser(req.body))
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(err.status).json({ erro: err.message })
    }
    console.error(err)
    res.status(500).json({ erro: 'Erro ao criar usuário.' })
  }
})

export default router
