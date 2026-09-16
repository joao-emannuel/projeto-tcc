import { Router } from 'express'
import { requireSession } from '../middleware/auth.js'
import { changeOwnPassword, deferOwnPassword } from '../services/accountService.js'
import { revokeSession } from '../services/sessionService.js'
import { ServiceError } from '../services/serviceError.js'

const router = Router()

function handle(action) {
  return async (req, res) => {
    try {
      res.json(await action(req))
    } catch (err) {
      if (err instanceof ServiceError) return res.status(err.status).json({ erro: err.message })
      console.error(err)
      res.status(500).json({ erro: 'Não foi possível atualizar sua conta. Tente novamente.' })
    }
  }
}

router.get('/conta', requireSession, (req, res) => res.json(req.session.usuario))
router.post('/conta/senha', requireSession, handle(req => changeOwnPassword(req.session.usuario, req.body)))
router.post('/conta/adiar-senha', requireSession, handle(req => deferOwnPassword(req.session.usuario)))
router.post('/logout', requireSession, (req, res) => {
  revokeSession(req.session.token)
  res.json({ mensagem: 'Sessão encerrada.' })
})

export default router
