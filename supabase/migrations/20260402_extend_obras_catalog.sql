-- Extend obras table with catalog fields (safe for re-run)
ALTER TABLE obras
  ADD COLUMN IF NOT EXISTS descricao    text,
  ADD COLUMN IF NOT EXISTS estado       text NOT NULL DEFAULT 'ativo'
                                        CHECK (estado IN ('ativo','concluido','suspenso','cancelado')),
  ADD COLUMN IF NOT EXISTS cliente_nome text,
  ADD COLUMN IF NOT EXISTS data_inicio  date,
  ADD COLUMN IF NOT EXISTS data_fim     date,
  ADD COLUMN IF NOT EXISTS updated_at   timestamptz NOT NULL DEFAULT now();

-- Index for quick lookup by estado
CREATE INDEX IF NOT EXISTS idx_obras_estado ON obras (estado);
CREATE INDEX IF NOT EXISTS idx_obras_code   ON obras (code);

-- Fornecedores: ensure updated_at exists (created in 20260329 but adding defensively)
ALTER TABLE fornecedores
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
