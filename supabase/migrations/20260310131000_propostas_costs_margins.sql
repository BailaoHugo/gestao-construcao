-- Upgrade Propostas schema with cost vs sale fields.
-- Run in Supabase SQL Editor or via Supabase CLI.

alter table proposta_linhas
  add column if not exists preco_custo_unitario numeric,
  add column if not exists total_custo_linha numeric,
  add column if not exists preco_venda_unitario numeric,
  add column if not exists total_venda_linha numeric;

alter table proposta_revisoes
  add column if not exists total_custo numeric,
  add column if not exists total_venda numeric,
  add column if not exists margem_valor numeric,
  add column if not exists margem_percentagem numeric;

