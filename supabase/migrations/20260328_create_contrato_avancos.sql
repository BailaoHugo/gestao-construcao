-- Controlo de Obra: avanços de faturação por contrato
-- Tabela que guarda os artigos da obra e a percentagem já faturada

CREATE TABLE IF NOT EXISTS contrato_avancos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_id uuid NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
  ordem integer NOT NULL DEFAULT 0,
  capitulo text NOT NULL DEFAULT '',
  descricao text NOT NULL,
  valor_contrato numeric(12,2) NOT NULL DEFAULT 0,
  percentagem_faturada numeric(5,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contrato_avancos_contrato_id ON contrato_avancos(contrato_id);
