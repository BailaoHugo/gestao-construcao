-- Módulo Faturação: tabelas principais
-- Adjudicação (30%) + Autos mensais por % de avanço por capítulo

-- Tabela principal de faturas
CREATE TABLE IF NOT EXISTS faturas (
  id                      uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_id             uuid NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
  numero                  text NOT NULL,
  tipo                    text NOT NULL CHECK (tipo IN ('adjudicacao', 'auto')),
  numero_auto             integer,
  estado                  text NOT NULL DEFAULT 'RASCUNHO'
                            CHECK (estado IN ('RASCUNHO', 'EMITIDA', 'PAGA')),
  percentagem_adjudicacao numeric(5,2) NOT NULL DEFAULT 30,
  data_emissao            date,
  data_vencimento         date,
  taxa_iva                numeric(5,2) NOT NULL DEFAULT 23,
  notas                   text NOT NULL DEFAULT '',
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contrato_id, tipo, numero_auto)
);

-- Avanço por capítulo (apenas para faturas de tipo 'auto')
CREATE TABLE IF NOT EXISTS fatura_auto_capitulos (
  id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  fatura_id             uuid NOT NULL REFERENCES faturas(id) ON DELETE CASCADE,
  capitulo              text NOT NULL,
  descricao             text NOT NULL,
  valor_contrato        numeric(12,2) NOT NULL DEFAULT 0,
  percentagem_anterior  numeric(5,2)  NOT NULL DEFAULT 0,
  percentagem_atual     numeric(5,2)  NOT NULL DEFAULT 0
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_faturas_contrato_id   ON faturas(contrato_id);
CREATE INDEX IF NOT EXISTS idx_faturas_tipo          ON faturas(tipo);
CREATE INDEX IF NOT EXISTS idx_faturas_estado        ON faturas(estado);
CREATE INDEX IF NOT EXISTS idx_fac_fatura_id         ON fatura_auto_capitulos(fatura_id);
