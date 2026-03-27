begin;

create table if not exists toconline_costs_staging (
  id bigserial primary key,
  source_key text not null unique,
  source_system text not null default 'toconline',
  source_doc_id bigint,
  source_file_name text not null,
  source_file_rel_path text,
  source_status text not null default 'copied',
  match_status text not null default 'SEM_OBRA',
  match_key_used text,
  obra text not null default 'SEM_OBRA',
  obra_folder text not null default 'SEM_OBRA',
  supplier text,
  company_name text,
  document_type text,
  document_no text,
  purchase_invoice_type text,
  purchase_invoice_no text,
  transaction_info text,
  invoice_date date,
  gross_total numeric(14,2),
  net_total numeric(14,2),
  tax_payable numeric(14,2),
  line_descriptions text,
  line_items jsonb,
  metadata jsonb not null default '{}'::jsonb,
  ingested_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_toconline_costs_staging_obra
  on toconline_costs_staging (obra);

create index if not exists idx_toconline_costs_staging_invoice_date
  on toconline_costs_staging (invoice_date);

create index if not exists idx_toconline_costs_staging_supplier
  on toconline_costs_staging (supplier);

create index if not exists idx_toconline_costs_staging_match_status
  on toconline_costs_staging (match_status);

create index if not exists idx_toconline_costs_staging_doc_no
  on toconline_costs_staging (document_no);

create index if not exists idx_toconline_costs_staging_ingested_at
  on toconline_costs_staging (ingested_at desc);

create index if not exists idx_toconline_costs_staging_metadata_gin
  on toconline_costs_staging using gin (metadata);

commit;
