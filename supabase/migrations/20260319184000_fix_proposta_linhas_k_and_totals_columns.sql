-- Corrige schema de proposta_linhas para ambientes que ainda não aplicaram
-- migrações recentes e evita erro "column k does not exist".
-- Idempotente: pode correr múltiplas vezes sem quebrar.

begin;

-- 1) Garantir coluna k com precisão explícita.
alter table proposta_linhas
  add column if not exists k numeric(10,4);

-- Se já existir como numeric sem precisão fixa, normaliza tipo.
alter table proposta_linhas
  alter column k type numeric(10,4) using round(coalesce(k, 1.30)::numeric, 4);

-- Backfill obrigatório.
update proposta_linhas
set k = 1.3000
where k is null;

alter table proposta_linhas
  alter column k set default 1.3000,
  alter column k set not null;

-- 2) Garantir colunas auxiliares pedidas (caso não existam no ambiente).
alter table proposta_linhas
  add column if not exists pu_venda numeric(14,4),
  add column if not exists total_custo numeric(14,4),
  add column if not exists total_venda numeric(14,4);

-- Backfill defensivo para colunas auxiliares.
update proposta_linhas
set
  pu_venda = coalesce(pu_venda, preco_venda_unitario, preco_unitario, 0),
  total_custo = coalesce(
    total_custo,
    total_custo_linha,
    coalesce(quantidade, 0) * coalesce(preco_custo_unitario, 0)
  ),
  total_venda = coalesce(
    total_venda,
    total_venda_linha,
    total_linha,
    coalesce(quantidade, 0) * coalesce(preco_venda_unitario, preco_unitario, 0)
  )
where
  pu_venda is null
  or total_custo is null
  or total_venda is null;

comment on column proposta_linhas.k is 'Coeficiente K para cálculo de venda.';
comment on column proposta_linhas.pu_venda is 'Preço unitário de venda (coluna de compatibilidade).';
comment on column proposta_linhas.total_custo is 'Total de custo da linha (coluna de compatibilidade).';
comment on column proposta_linhas.total_venda is 'Total de venda da linha (coluna de compatibilidade).';

commit;

