import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

import usuariosRouter from './routes/users.js'
import loginRouter from './routes/login.js'
import esqueceu_senhaRouter from './routes/forgot-password.js'

dotenv.config()

const app = express()

app.use(cors())
app.use(express.json())

app.use('/api/usuarios', usuariosRouter)
app.use('/api/login', loginRouter)
app.use('/api', esqueceu_senhaRouter) // já contém /esqueci-senha e /redefinir-senha

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`)
})