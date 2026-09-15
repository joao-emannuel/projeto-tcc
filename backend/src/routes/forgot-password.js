import { Router } from 'express'
import { requestPasswordReset, resetPassword } from '../services/passwordResetService.js'
import { ServiceError } from '../services/serviceError.js'

const router = Router()

router.post('/esqueci-senha', async (req, res) => {
  try {
    res.json(await requestPasswordReset(req.body))
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(err.status).json({ erro: err.message })
    }
    console.error(err)
    res.status(500).json({ erro: 'Erro ao processar solicitação.' })
  }
})

router.post('/redefinir-senha', async (req, res) => {
  try {
    res.json(await resetPassword(req.body))
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(err.status).json({ erro: err.message })
    }
    console.error(err)
    res.status(500).json({ erro: 'Erro ao redefinir senha.' })
  }
})

export default router
