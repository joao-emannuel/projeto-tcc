import { authenticate, isAdmin } from '../services/sessionService.js'
import { ServiceError } from '../services/serviceError.js'

export async function requireSession(req, res, next) {
  try {
    req.session = await authenticate(req.get('Authorization'))
    next()
  } catch (err) {
    if (err instanceof ServiceError) return res.status(err.status).json({ erro: err.message })
    console.error(err)
    res.status(500).json({ erro: 'Erro ao verificar sessão.' })
  }
}

export function requireAdmin(req, res, next) {
  if (!isAdmin(req.session.usuario)) return res.status(403).json({ erro: 'Acesso exclusivo para administradores.' })
  next()
}
