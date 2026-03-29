-- TOConline Integration Tables
-- Run this migration in your Supabase SQL editor

-- 1. Add toconline_id to existing fornecedores table
ALTER TABLE fornecedores
  ADD COLUMN IF NOT EXISTS toconline_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS toconline_synced_at TIMESTAMPTZ;

-- 2. TOConline Clientes cache (separate from contratos)
CREATE TABLE IF NOT EXISTS toconline_clientes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  toconline_id  TEXT UNIQUE NOT NULL,
  nome          TEXT NOT NULL,
  nif           TEXT,
  email         TEXT,
  telefone      TEXT,
  morada        TEXT,
  ativo         BOOLEAN DEFAULT true,
  synced_at     TIMESTAMPTZ DEFAULT now()
);

-- 3. Centros de Custo (obras no TOConline)
CREATE TABLE IF NOT EXISTS centros_custo (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  toconline_id  TEXT UNIQUE NOT NULL,
  codigo        TEXT,
  designacao    TEXT NOT NULL,
  ativo         BOOLEAN DEFAULT true,
  synced_at     TIMESTAMPTZ DEFAULT now()
);

-- 4. Link opcional entre contratos e centros de custo TOConline
ALTER TABLE contratos
  ADD COLUMN IF NOT EXISTS centro_custo_id UUID REFERENCES centros_custo(id);

-- 5. Log de sincronizacoes
CREATE TABLE IF NOT EXISTS toconline_sync_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  iniciado_em   TIMESTAMPTZ DEFAULT now(),
  concluido_em  TIMESTAMPTZ,
  estado        TEXT DEFAULT 'iniciado', -- iniciado | ok | erro
  resultado     JSONB,
  erro          TEXT
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_centros_custo_ativo ON centros_custo(ativo);
CREATE INDEX IF NOT EXISTS idx_toconline_clientes_nif ON toconline_clientes(nif);
CREATE INDEX IF NOT EXISTS idx_fornecedores_toconline ON fornecedores(toconline_id);
