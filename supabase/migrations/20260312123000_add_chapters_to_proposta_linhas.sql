-- Add chapter information to proposta_linhas for Propostas v1.2.
-- Safe to run multiple times.

alter table proposta_linhas
  add column if not exists grande_capitulo text,
  add column if not exists capitulo text;

