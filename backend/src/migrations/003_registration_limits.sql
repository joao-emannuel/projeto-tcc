ALTER TABLE cadastros_pendentes
  ADD COLUMN IF NOT EXISTS tentativas_incorretas INTEGER NOT NULL DEFAULT 0;

-- A cota usa administrador + e-mail para continuar valendo ao abrir outro cadastro.
CREATE TABLE IF NOT EXISTS envios_cadastro (
  id BIGSERIAL PRIMARY KEY,
  administrador_id INTEGER NOT NULL REFERENCES usuarios(id),
  email TEXT NOT NULL,
  enviado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS envios_cadastro_limite_idx
  ON envios_cadastro (administrador_id, email, enviado_em);
