-- Master article catalogue for Propostas and Orcamentos.
-- This table is intended to be the single source of truth for artigos.

create table if not exists artigos (
  id uuid primary key default gen_random_uuid(),

  codigo text not null unique,
  descricao text not null,
  unidade text,

  grande_capitulo text,
  capitulo text,
  subgrupo text,
  disciplina text,
  categoria_custo text,
  tipo_medicao text,

  inclui_mo boolean not null default false,
  pu_custo numeric,
  pu_venda numeric,

  ativo boolean not null default true,

  origem text not null default 'MASTER',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_artigos_codigo on artigos (codigo);
create index if not exists idx_artigos_capitulo on artigos (capitulo);
create index if not exists idx_artigos_grande_capitulo on artigos (grande_capitulo);

