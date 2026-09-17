CREATE TABLE IF NOT EXISTS resultados (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  foto_id INTEGER REFERENCES fotos(id) ON DELETE SET NULL,
  corte_nome TEXT NOT NULL CHECK (length(trim(corte_nome)) BETWEEN 1 AND 100),
  preview_url TEXT,
  favorito BOOLEAN NOT NULL DEFAULT false,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS resultados_usuario_data_idx ON resultados (usuario_id, criado_em DESC, id DESC);
