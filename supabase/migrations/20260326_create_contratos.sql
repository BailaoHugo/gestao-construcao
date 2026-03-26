-- Add cliente_nipc to propostas if not exists
ALTER TABLE propostas ADD COLUMN IF NOT EXISTS cliente_nipc text;

-- Create contratos table
CREATE TABLE IF NOT EXISTS contratos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  proposta_id uuid NOT NULL REFERENCES propostas(id) ON DELETE CASCADE,
  revisao_id uuid NOT NULL REFERENCES proposta_revisoes(id),
  estado text NOT NULL DEFAULT 'RASCUNHO' CHECK (estado IN ('RASCUNHO', 'EMITIDO')),
  data_contrato date,
  data_conclusao_prevista date,
  signatario_dono_nome text NOT NULL DEFAULT '',
  signatario_dono_funcao text NOT NULL DEFAULT '',
  signatario_empreiteiro_nome text NOT NULL DEFAULT '',
  signatario_empreiteiro_funcao text NOT NULL DEFAULT '',
  clausulas jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contratos_proposta_id ON contratos(proposta_id);
CREATE INDEX IF NOT EXISTS idx_contratos_revisao_id ON contratos(revisao_id);
CREATE INDEX IF NOT EXISTS idx_contratos_estado ON contratos(estado);
