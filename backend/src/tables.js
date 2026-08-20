import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const { Client } = pg

const {
    PGHOST,
    PGPORT,
    PGUSER,
    PGPASSWORD,
    PGDATABASE,
    PGSSL,
} = process.env

const useSSL = PGSSL === 'true'
const sslOption = useSSL ? { rejectUnauthorized: false } : false

async function createTable() {
    const client = new Client({
        host: PGHOST,
        port: Number(PGPORT),
        user: PGUSER,
        password: PGPASSWORD,
        database: PGDATABASE,
        ssl: sslOption
    })

    await client.connect()

    await client.query(`
        CREATE TABLE IF NOT EXISTS usuarios (
          id SERIAL PRIMARY KEY,
          nome TEXT NOT NULL,
          apelido TEXT NOT NULL UNIQUE,
          telefone TEXT NOT NULL,
          email TEXT NOT NULL,
          senha_hash TEXT NOT NULL,
          ativo BOOLEAN NOT NULL DEFAULT true,
          criado_em TIMESTAMP NOT NULL DEFAULT now()
        );
    `)

    console.log('✅ Tabela "usuarios" pronta.')

    await client.end()
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