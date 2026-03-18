-- Preparar proposta_linhas para integração com catálogo e evolução futura.
-- Novas colunas: k, observacoes. Default origem = 'manual'.
-- Seguro para registos existentes (colunas nullable ou com default).

-- Coeficiente de venda (ex.: 1.30). Default 1.30.
alter table proposta_linhas
  add column if not exists k numeric default 1.30;

-- Observações por linha (texto livre).
alter table proposta_linhas
  add column if not exists observacoes text;

-- Ordem, codigo_artigo, origem, grande_capitulo já existem na tabela.
-- Garantir default 'manual' para origem em novos inserts.
alter table proposta_linhas
  alter column origem set default 'manual';

comment on column proposta_linhas.k is 'Coeficiente de venda (ex.: 1.30).';
comment on column proposta_linhas.observacoes is 'Observações da linha (texto livre).';
