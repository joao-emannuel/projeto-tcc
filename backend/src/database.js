import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const { Pool } = pg

const useSSL = process.env.PGSSL === 'true'

export const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT),
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  ssl: useSSL ? { rejectUnauthorized: false } : false,
})