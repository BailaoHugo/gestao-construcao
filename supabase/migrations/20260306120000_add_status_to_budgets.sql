-- Add status column to budgets for workflow (Em execução, Em análise, Aprovado).
-- Run in Supabase SQL Editor or via Supabase CLI.

alter table budgets
  add column if not exists status text not null default 'EM_EXECUCAO';

alter table budgets
  add constraint budgets_status_check
  check (status in ('EM_EXECUCAO', 'EM_ANALISE', 'APROVADO'));

comment on column budgets.status is 'Estado do orçamento: EM_EXECUCAO, EM_ANALISE, APROVADO';
