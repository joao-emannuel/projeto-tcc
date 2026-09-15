CREATE TABLE IF NOT EXISTS fotos (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  nome_original TEXT NOT NULL,
  tipo_mime TEXT NOT NULL CHECK (tipo_mime IN ('image/jpeg', 'image/png')),
  tamanho_bytes INTEGER NOT NULL CHECK (tamanho_bytes > 0 AND tamanho_bytes <= 10485760),
  conteudo BYTEA NOT NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT now(),
  CHECK (octet_length(conteudo) = tamanho_bytes)
);
