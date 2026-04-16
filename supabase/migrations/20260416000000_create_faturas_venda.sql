-- Módulo Vendas: faturas emitidas a clientes (sincronizadas do TOConline)
CREATE TABLE IF NOT EXISTS faturas_venda (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  toconline_id text UNIQUE,
  numero text,
  tipo_documento text,
  data date,
  data_vencimento date,
  cliente_nome text,
  cliente_nif text,
  valor_sem_iva numeric(12,2),
  valor_iva numeric(12,2),
  total numeric(12,2),
  obra_id uuid REFERENCES obras(id),
  notas text,
  estado text DEFAULT 'emitida',
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_faturas_venda_obra_id ON faturas_venda(obra_id);
CREATE INDEX IF NOT EXISTS idx_faturas_venda_data ON faturas_venda(data);
CREATE INDEX IF NOT EXISTS idx_faturas_venda_toconline_id ON faturas_venda(toconline_id);
