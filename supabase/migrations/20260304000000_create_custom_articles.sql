-- Custom articles (user-created in "Novo orçamento") for catalog merge.
-- Run this in Supabase SQL Editor or via Supabase CLI.

create table if not exists custom_articles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text not null,
  unit text not null,
  grande_capitulo_code text not null,
  capitulo_code text not null,
  pu_custo numeric,
  pu_venda_fixo numeric,
  created_at timestamptz not null default now()
);

create index if not exists idx_custom_articles_capitulo on custom_articles (capitulo_code);
create index if not exists idx_custom_articles_grande_capitulo on custom_articles (grande_capitulo_code);

comment on table custom_articles is 'Artigos criados pelo utilizador no Novo orçamento; merge com artigos_master no catálogo.';
