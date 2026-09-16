import express from 'express'
import cors from 'cors'

// Servidor descartável para verificar a interface, sem banco ou envio de e-mail.
const app = express()
app.use(cors())
app.use(express.json())
const users = [
  { id: 901, nome: 'Pedro Demonstração', apelido: 'pedro', email: 'pedro@example.test', telefone: '11999990000', nivel_acesso: 'admin', ativo: true, troca_senha_pendente: false },
  { id: 902, nome: 'Ana Souza', apelido: 'ana', email: 'ana@example.test', telefone: '11999990001', nivel_acesso: 'usuario', ativo: true, troca_senha_pendente: false },
  { id: 903, nome: 'Lucas Costa', apelido: 'lucas', email: 'lucas@example.test', telefone: '11999990002', nivel_acesso: 'usuario', ativo: false, troca_senha_pendente: false },
  { id: 904, nome: 'Primeiro Acesso', apelido: 'primeiro', email: 'primeiro@example.test', telefone: '', nivel_acesso: 'usuario', ativo: true, troca_senha_pendente: true },
]
let pending
const current = req => req.get('Authorization') === `Bearer ${'b'.repeat(64)}` ? users[3] : users[0]
app.post('/api/login', (req, res) => {
  const isNew = req.body.usernameOrEmail === 'primeiro'
  res.json({ ...(isNew ? users[3] : users[0]), sessionToken: (isNew ? 'b' : 'a').repeat(64) })
})
app.get('/api/conta', (req, res) => res.json(current(req)))
app.post('/api/logout', (req, res) => res.sendStatus(204))
app.get('/api/admin/usuarios', (req, res) => res.json(users))
app.post('/api/admin/cadastros', (req, res) => {
  pending = { ...req.body, id: 905 }
  res.json({ cadastroId: 'test-registration', email: pending.email, expiraEm: new Date(Date.now() + 1800000) })
})
app.post('/api/admin/cadastros/:id/reenviar', (req, res) => res.json({ cadastroId: 'test-registration', email: pending.email, expiraEm: new Date(Date.now() + 1800000) }))
app.post('/api/admin/cadastros/:id/confirmar', (req, res) => {
  if (req.body.codigo !== '601942') return res.status(400).json({ erro: 'Código incorreto. Confira o código recebido por e-mail.' })
  const usuario = { ...pending, ativo: true, troca_senha_pendente: true }
  users.push(usuario)
  pending = null
  res.status(201).json({ usuario })
})
app.patch('/api/admin/usuarios/:id', (req, res) => {
  const usuario = users.find(user => user.id === Number(req.params.id))
  Object.assign(usuario, req.body)
  res.json({ usuario })
})
app.post('/api/admin/usuarios/:id/recuperar-senha', (req, res) => res.json({ mensagem: 'Envio simulado para verificação da interface.' }))
app.post('/api/conta/adiar-senha', (req, res) => {
  const usuario = current(req)
  usuario.troca_senha_pendente = false
  res.json({ usuario })
})
app.listen(3001, '127.0.0.1', () => console.log('API de verificação sem e-mail em 127.0.0.1:3001'))
