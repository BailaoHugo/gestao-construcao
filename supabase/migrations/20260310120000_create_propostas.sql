-- Propostas comerciais (MVP módulo Propostas).
-- Executar no Supabase SQL Editor ou via Supabase CLI.
-- Garante a existência das tabelas usadas pelo módulo Propostas.

create table if not exists propostas (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  obra_id uuid null,
  cliente_nome text not null,
  cliente_contacto text null,
  cliente_email text null,
  obra_nome text null,
  obra_morada text null,
  referencia_interna text null,
  notas text null,
  estado_atual text not null default 'RASCUNHO',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table propostas is 'Cabeçalho de propostas comerciais (módulo Propostas).';
comment on column propostas.codigo is 'Código único da proposta (ex.: P-2026-0001).';
comment on column propostas.estado_atual is 'Estado atual da proposta (ex.: RASCUNHO, EMITIDA).';

create table if not exists proposta_revisoes (
  id uuid primary key default gen_random_uuid(),
  proposta_id uuid not null references propostas(id) on delete cascade,
  numero_revisao integer not null,
  estado text not null, -- RASCUNHO ou EMITIDA
  data_proposta date null,
  validade_texto text null,
  total numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_proposta_revisoes_unique_numero
  on proposta_revisoes (proposta_id, numero_revisao);

comment on table proposta_revisoes is 'Revisões de cada proposta (R1, R2, ...).';
comment on column proposta_revisoes.estado is 'Estado da revisão: RASCUNHO ou EMITIDA.';

create table if not exists proposta_linhas (
  id uuid primary key default gen_random_uuid(),
  revisao_id uuid not null references proposta_revisoes(id) on delete cascade,
  ordem integer not null,
  origem text not null, -- CATALOGO ou LIVRE
  artigo_id uuid null,
  codigo_artigo text null,
  descricao text not null,
  unidade text null,
  quantidade numeric not null default 0,
  preco_unitario numeric not null default 0,
  total_linha numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_proposta_linhas_revisao_ordem
  on proposta_linhas (revisao_id, ordem);

comment on table proposta_linhas is 'Linhas de cada revisão de proposta.';

