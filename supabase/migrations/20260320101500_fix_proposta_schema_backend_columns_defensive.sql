-- Compatibilidade defensiva para o módulo de Propostas.
-- Garante que todas as colunas referenciadas pelo backend existem na BD.
-- Idempotente (safe de correr múltiplas vezes).

begin;

-- =========================
-- proposta_linhas (linhas)
-- =========================

alter table proposta_linhas
  add column if not exists k numeric(10,4);

-- A UI/logic assume fallback de 1.30 quando k vier null.
update proposta_linhas
set k = 1.3000
where k is null;

alter table proposta_linhas
  alter column k set default 1.3000,
  alter column k set not null;

alter table proposta_linhas
  add column if not exists observacoes text;

alter table proposta_linhas
  add column if not exists codigo_artigo text;

alter table proposta_linhas
  add column if not exists grande_capitulo text,
  add column if not exists capitulo text;

-- Campos de custo/venda (o backend grava/ler através destes nomes)
alter table proposta_linhas
  add column if not exists preco_custo_unitario numeric,
  add column if not exists total_custo_linha numeric,
  add column if not exists preco_venda_unitario numeric,
  add column if not exists total_venda_linha numeric;

-- Backfills defensivos para manter coerência dos valores derivados.
-- 1) custo
update proposta_linhas
set
  preco_custo_unitario = coalesce(preco_custo_unitario, preco_unitario, 0),
  total_custo_linha = coalesce(
    total_custo_linha,
    total_custo_linha,
    quantidade * coalesce(preco_custo_unitario, preco_unitario, 0)
  );

-- 2) venda (pu_venda = pu_custo * k)
update proposta_linhas
set
  preco_venda_unitario = coalesce(
    preco_venda_unitario,
    coalesce(preco_custo_unitario, preco_unitario, 0) * k
  ),
  total_venda_linha = coalesce(
    total_venda_linha,
    quantidade * coalesce(
      preco_venda_unitario,
      coalesce(preco_custo_unitario, preco_unitario, 0) * k
    )
  );

-- Default esperado para origem em novos inserts.
alter table proposta_linhas
  alter column origem set default 'manual';

-- =========================
-- proposta_revisoes (revisões)
-- =========================

alter table proposta_revisoes
  add column if not exists total_custo numeric,
  add column if not exists total_venda numeric,
  add column if not exists margem_valor numeric,
  add column if not exists margem_percentagem numeric;

-- Backfill (caso existam linhas antigas)
update proposta_revisoes
set
  total_custo = coalesce(total_custo, 0),
  total_venda = coalesce(total_venda, 0),
  margem_valor = coalesce(margem_valor, 0),
  margem_percentagem = coalesce(margem_percentagem, 0);

commit;

