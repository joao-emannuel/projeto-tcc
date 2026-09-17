import express from 'express'
import cors from 'cors'
import usersRouter from './routes/users.js'
import loginRouter from './routes/login.js'
import passwordResetRouter from './routes/forgot-password.js'
import photosRouter from './routes/photos.js'
import adminRouter from './routes/admin.js'
import accountRouter from './routes/account.js'
import galleryRouter from './routes/gallery.js'

const app = express()

app.use(cors())
app.use('/api/fotos', photosRouter)
app.use(express.json())

app.use('/api/usuarios', usersRouter)
app.use('/api/login', loginRouter)
app.use('/api', passwordResetRouter)
app.use('/api/admin', adminRouter)
app.use('/api', accountRouter)
app.use('/api/galeria', galleryRouter)

export default app
