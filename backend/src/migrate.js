import pg from 'pg'
import { config } from './config.js'
import { applyMigrations } from './migrations/applyMigrations.js'

const client = new pg.Client(config.database)

try {
  await client.connect()
  await applyMigrations(client)
  console.log('Migrações de fotos e administração concluídas.')
} catch (err) {
  console.error('Erro ao atualizar o banco:', err.message)
  process.exitCode = 1
} finally {
  await client.end()
}
