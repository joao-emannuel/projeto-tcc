import express from 'express'
import cors from 'cors'
import usersRouter from './routes/users.js'
import loginRouter from './routes/login.js'
import passwordResetRouter from './routes/forgot-password.js'
import photosRouter from './routes/photos.js'

const app = express()

app.use(cors())
app.use('/api/fotos', photosRouter)
app.use(express.json())

app.use('/api/usuarios', usersRouter)
app.use('/api/login', loginRouter)
app.use('/api', passwordResetRouter)

export default app
