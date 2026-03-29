-- Controlo de Obra: garantir que as tabelas existem (safe for re-run)
-- Cria fornecedores, trabalhadores, faturas_recebidas, custos_obra

CREATE TABLE IF NOT EXISTS fornecedores (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  nif text,
  email text,
  telefone text,
  morada text,
  tipo text NOT NULL DEFAULT 'fornecedor' CHECK (tipo IN ('fornecedor','subempreiteiro','ambos')),
  notas text,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trabalhadores (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  cargo text,
  custo_hora numeric NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  notas text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS faturas_recebidas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_id uuid REFERENCES contratos(id) ON DELETE SET NULL,
  fornecedor_id uuid REFERENCES fornecedores(id) ON DELETE SET NULL,
  origem text NOT NULL DEFAULT 'upload' CHECK (origem IN ('email','upload')),
  estado text NOT NULL DEFAULT 'pendente' CHECK (estado IN ('pendente','processando','revisto','aprovado','rejeitado')),
  ficheiro_url text,
  ficheiro_nome text,
  ficheiro_tipo text,
  dados_extraidos jsonb,
  email_uid text,
  email_remetente text,
  email_assunto text,
  email_data timestamptz,
  processado_em timestamptz,
  erro_processamento text,
  notas text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS custos_obra (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_id uuid NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
  fatura_recebida_id uuid REFERENCES faturas_recebidas(id) ON DELETE SET NULL,
  tipo text NOT NULL CHECK (tipo IN ('material','subempreitada','mao_de_obra','equipamento')),
  data date NOT NULL,
  descricao text,
  capitulo_ref text,
  fornecedor_id uuid REFERENCES fornecedores(id) ON DELETE SET NULL,
  trabalhador_id uuid REFERENCES trabalhadores(id) ON DELETE SET NULL,
  quantidade numeric,
  custo_unitario numeric,
  valor numeric NOT NULL,
  fatura_ref text,
  notas text,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_faturas_recebidas_contrato ON faturas_recebidas(contrato_id);
CREATE INDEX IF NOT EXISTS idx_faturas_recebidas_estado ON faturas_recebidas(estado);
CREATE INDEX IF NOT EXISTS idx_custos_obra_contrato ON custos_obra(contrato_id);
CREATE INDEX IF NOT EXISTS idx_custos_obra_fatura ON custos_obra(fatura_recebida_id);
