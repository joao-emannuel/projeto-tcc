import { Router } from 'express'
import { requireSession, requireAdmin } from '../middleware/auth.js'
import { listUsers } from '../services/usersService.js'
import { beginRegistration, resendRegistration, confirmRegistration, editUser } from '../services/adminService.js'
import { ServiceError } from '../services/serviceError.js'

const router = Router()
router.use(requireSession, requireAdmin)

function handle(action, status = 200) {
  return async (req, res) => {
    try {
      res.status(status).json(await action(req))
    } catch (err) {
      if (err instanceof ServiceError) {
        if (err.retryAfterSeconds) res.set('Retry-After', String(err.retryAfterSeconds))
        return res.status(err.status).json({
          erro: err.message,
          ...(err.retryAfterSeconds !== undefined && { retryAfterSeconds: err.retryAfterSeconds }),
          ...(err.reenviarEm !== undefined && { reenviarEm: err.reenviarEm }),
          ...(err.codigoBloqueado !== undefined && { codigoBloqueado: err.codigoBloqueado }),
          ...(err.tentativasRestantes !== undefined && { tentativasRestantes: err.tentativasRestantes }),
        })
      }
      console.error(err)
      res.status(500).json({ erro: 'Não foi possível concluir a operação. Tente novamente.' })
    }
  }
}

router.get('/usuarios', handle(() => listUsers()))
router.post('/cadastros', handle(req => beginRegistration(req.session.usuario, req.body), 201))
router.post('/cadastros/:id/reenviar', handle(req => resendRegistration(req.session.usuario, req.params.id)))
router.post('/cadastros/:id/confirmar', handle(req => confirmRegistration(req.session.usuario, req.params.id, req.body), 201))
router.patch('/usuarios/:id', handle(req => editUser(req.session.usuario, req.params.id, req.body)))

export default router
