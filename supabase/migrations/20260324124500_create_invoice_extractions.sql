begin;

create table if not exists invoice_extractions (
  id bigserial primary key,
  source_key text not null,
  extract_version text not null default 'v1',
  status text not null default 'pending',
  extractor text not null default 'pdf_text_v1',
  confidence_score numeric(5,2),
  raw_text text,
  header_json jsonb not null default '{}'::jsonb,
  lines_json jsonb not null default '[]'::jsonb,
  validation_json jsonb not null default '{}'::jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_key, extract_version)
);

create index if not exists idx_invoice_extractions_source_key
  on invoice_extractions (source_key);

create index if not exists idx_invoice_extractions_status
  on invoice_extractions (status);

create index if not exists idx_invoice_extractions_created_at
  on invoice_extractions (created_at desc);

commit;
