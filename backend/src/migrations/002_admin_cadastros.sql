ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS troca_senha_pendente BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS cadastros_pendentes (
  id UUID PRIMARY KEY,
  administrador_id INTEGER NOT NULL REFERENCES usuarios(id),
  nome TEXT NOT NULL,
  apelido TEXT NOT NULL,
  telefone TEXT NOT NULL,
  email TEXT NOT NULL,
  nivel_acesso TEXT NOT NULL DEFAULT 'usuario',
  senha_hash TEXT NOT NULL,
  codigo_hash TEXT NOT NULL,
  expira_em TIMESTAMPTZ NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
