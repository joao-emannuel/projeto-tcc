import pg from 'pg'
import { config } from './config.js'
import { applyMigrations } from './migrations/applyMigrations.js'

const { Client } = pg

async function createTable() {
    const client = new Client(config.database)

    await client.connect()

    try {
        await client.query(`
        CREATE TABLE IF NOT EXISTS usuarios (
          id SERIAL PRIMARY KEY,
          nome TEXT NOT NULL,
          apelido TEXT NOT NULL UNIQUE,
          telefone TEXT NOT NULL,
          email TEXT NOT NULL,
          senha_hash TEXT NOT NULL,
          nivel_acesso TEXT NOT NULL DEFAULT 'usuario',
          ativo BOOLEAN NOT NULL DEFAULT true,
          criado_em TIMESTAMP NOT NULL DEFAULT now(),
          token_redefinicao_senha TEXT,
          token_redefinicao_senha_expira TIMESTAMP
        );
    `)

        console.log('✅ Tabela "usuarios" pronta.')
        await applyMigrations(client)
        console.log('✅ Migrações de fotos, administração e galeria concluídas.')
    } finally {
        await client.end()
    }
}

async function main() {
    try {
        await createTable()
        console.log('🎉 Setup do banco concluído com sucesso.')
        process.exit(0)
    } catch (err) {
        console.error('❌ Erro ao configurar o banco:', err.message)
        process.exit(1)
    }
}

main()
