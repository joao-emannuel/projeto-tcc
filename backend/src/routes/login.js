import { Router } from 'express'
import { login } from '../services/authService.js'
import { ServiceError } from '../services/serviceError.js'

const router = Router()

router.post('/', async (req, res) => {
  try {
    res.json(await login(req.body))
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(err.status).json({ erro: err.message })
    }
    console.error(err)
    res.status(500).json({ erro: 'Erro ao fazer login.' })
  }
})

export default router
