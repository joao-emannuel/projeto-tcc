import dotenv from 'dotenv'

dotenv.config()

export const config = {
  port: process.env.PORT || 3000,
  frontendUrl: (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, ''),
  database: {
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT),
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false,
  },
  email: {
    apiKey: process.env.RESEND_API_KEY,
    from: process.env.RESEND_FROM_EMAIL || 'naoresponda@visionfade.com.br',
  },
}
