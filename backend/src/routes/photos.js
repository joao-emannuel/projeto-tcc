import express, { Router } from 'express'
import { savePhoto } from '../services/photosService.js'
import { ServiceError } from '../services/serviceError.js'

const router = Router()

router.post('/', express.raw({ type: ['image/jpeg', 'image/png'], limit: '10mb' }), async (req, res) => {
  const tipoMime = (req.get('Content-Type') || '').split(';')[0].trim().toLowerCase()
  const photo = await savePhoto({
    usuarioId: req.query.usuarioId,
    nomeOriginal: req.query.nome,
    tipoMime,
    conteudo: req.body,
  })

  res.status(201).json(photo)
})

router.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ erro: 'A foto deve ter no máximo 10 MB.' })
  }
  if (err instanceof ServiceError) {
    return res.status(err.status).json({ erro: err.message })
  }
  if (err.status === 400 || err.status === 415) {
    return res.status(err.status).json({ erro: 'Não foi possível ler o arquivo enviado.' })
  }

  console.error(err)
  res.status(500).json({ erro: 'Erro ao salvar a foto.' })
})

export default router
