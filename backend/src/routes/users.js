import { Router } from 'express'
import { listUsers } from '../services/usersService.js'
import { requireSession, requireAdmin } from '../middleware/auth.js'

const router = Router()
router.use(requireSession, requireAdmin)

router.get('/', async (req, res) => {
  try {
    res.json(await listUsers())
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao buscar usuários.' })
  }
})

router.post('/', (req, res) => {
  res.status(410).json({ erro: 'Cadastre usuários pela interface do administrador para verificar o e-mail.' })
})

export default router
