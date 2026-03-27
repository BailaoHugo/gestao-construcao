begin;

-- Dimensão obra: código alinhado ao texto de match TOConline (pasta / campo obra).
create table if not exists obras (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_obras_name on obras (name);

-- Fornecedor: NIF único quando existir.
create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  nif text,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint suppliers_name_not_empty check (length(trim(name)) > 0)
);

create unique index if not exists suppliers_nif_unique
  on suppliers (nif)
  where nif is not null and length(trim(nif)) = 9;

create index if not exists idx_suppliers_name_lower on suppliers (lower(name));

-- Documento (1 por source_key / factura).
create table if not exists invoice_documents (
  id bigserial primary key,
  source_key text not null unique,
  source_system text not null default 'toconline',
  supplier_id uuid references suppliers (id) on delete set null,
  obra_id uuid references obras (id) on delete set null,
  match_status text,
  match_key_used text,
  invoice_date date,
  document_type text,
  document_no text,
  purchase_invoice_no text,
  transaction_info text,
  gross_total numeric(14, 2),
  net_total numeric(14, 2),
  tax_payable numeric(14, 2),
  source_file_name text,
  source_file_rel_path text,
  extract_version text not null default 'v1',
  header_extras jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_invoice_documents_obra_id on invoice_documents (obra_id);
create index if not exists idx_invoice_documents_supplier_id on invoice_documents (supplier_id);
create index if not exists idx_invoice_documents_invoice_date on invoice_documents (invoice_date);
create index if not exists idx_invoice_documents_header_extras on invoice_documents using gin (header_extras);

-- Linhas da factura (grão analítico).
create table if not exists invoice_lines (
  id bigserial primary key,
  invoice_document_id bigint not null references invoice_documents (id) on delete cascade,
  line_no int not null,
  article_code text,
  description text,
  unit text,
  quantity numeric(18, 6),
  unit_price numeric(18, 6),
  line_total numeric(14, 2),
  discount_amount numeric(14, 2),
  vat_rate_percent numeric(6, 2),
  vat_amount numeric(14, 2),
  line_extras jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (invoice_document_id, line_no)
);

create index if not exists idx_invoice_lines_document_id on invoice_lines (invoice_document_id);
create index if not exists idx_invoice_lines_description on invoice_lines (description);
create index if not exists idx_invoice_lines_line_extras on invoice_lines using gin (line_extras);

commit;
