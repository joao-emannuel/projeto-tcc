import { Router } from 'express'
import { requireSession } from '../middleware/auth.js'
import { getGallery, getGalleryResult, setGalleryFavorite, removeGalleryResult } from '../services/galleryService.js'
import { ServiceError } from '../services/serviceError.js'

const router = Router()
router.use(requireSession)

function handle(action) {
  return async (req, res) => {
    try {
      res.json(await action(req.session.usuario.id, req))
    } catch (error) {
      if (error instanceof ServiceError) return res.status(error.status).json({ erro: error.message })
      console.error(error)
      res.status(500).json({ erro: 'Não foi possível acessar a galeria. Tente novamente.' })
    }
  }
}

router.get('/', handle(id => getGallery(id)))
router.get('/:id', handle((userId, req) => getGalleryResult(userId, req.params.id)))
router.patch('/:id', handle((userId, req) => setGalleryFavorite(userId, req.params.id, req.body)))
router.delete('/:id', handle((userId, req) => removeGalleryResult(userId, req.params.id)))

export default router
