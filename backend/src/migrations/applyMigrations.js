import { readFile } from 'node:fs/promises'

export async function applyMigrations(client) {
  for (const migration of ['001_create_fotos.sql', '002_admin_cadastros.sql', '003_registration_limits.sql', '004_create_resultados.sql']) {
    const sql = await readFile(new URL(migration, import.meta.url), 'utf8')
    await client.query(sql)
  }
}
