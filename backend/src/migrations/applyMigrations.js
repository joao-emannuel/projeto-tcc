import { readFile } from 'node:fs/promises'

export async function applyMigrations(client) {
  const sql = await readFile(new URL('./001_create_fotos.sql', import.meta.url), 'utf8')
  await client.query(sql)
}
