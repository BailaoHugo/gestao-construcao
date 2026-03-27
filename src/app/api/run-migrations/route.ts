import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS fornecedores (
    id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    nome          text        NOT NULL,
    nif           text,
    email         text,
    telefone      text,
    morada        text,
    tipo          text        NOT NULL DEFAULT 'fornecedor'
                              CHECK (tipo IN ('fornecedor', 'subempreiteiro', 'ambos')),
    notas         text,
    ativo         boolean     NOT NULL DEFAULT true,
    criado_em     timestamptz NOT NULL DEFAULT now(),
    atualizado_em timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_fornecedores_tipo  ON fornecedores(tipo)`,
  `CREATE INDEX IF NOT EXISTS idx_fornecedores_ativo ON fornecedores(ativo)`,
  `CREATE INDEX IF NOT EXISTS idx_fornecedores_nif   ON fornecedores(nif) WHERE nif IS NOT NULL`,
  `CREATE TABLE IF NOT EXISTS trabalhadores (
    id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    nome          text        NOT NULL,
    cargo         text,
    custo_hora    numeric(10,2) NOT NULL DEFAULT 0,
    ativo         boolean     NOT NULL DEFAULT true,
    notas         text,
    criado_em     timestamptz NOT NULL DEFAULT now(),
    atualizado_em timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_trabalhadores_ativo ON trabalhadores(ativo)`,
  `CREATE TABLE IF NOT EXISTS faturas_recebidas (
    id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    contrato_id          uuid        REFERENCES contratos(id) ON DELETE SET NULL,
    fornecedor_id        uuid        REFERENCES fornecedores(id) ON DELETE SET NULL,
    origem               text        NOT NULL DEFAULT 'upload'
                                     CHECK (origem IN ('email', 'upload')),
    estado               text        NOT NULL DEFAULT 'pendente'
                                     CHECK (estado IN ('pendente', 'processando', 'revisto', 'aprovado', 'rejeitado')),
    ficheiro_url         text,
    ficheiro_nome        text,
    ficheiro_tipo        text,
    dados_extraidos      jsonb,
    email_remetente      text,
    email_assunto        text,
    email_data           timestamptz,
    email_uid            text,
    processado_em        timestamptz,
    erro_processamento   text,
    notas                text,
    criado_em            timestamptz NOT NULL DEFAULT now(),
    atualizado_em        timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_faturas_recebidas_estado    ON faturas_recebidas(estado)`,
  `CREATE INDEX IF NOT EXISTS idx_faturas_recebidas_contrato  ON faturas_recebidas(contrato_id) WHERE contrato_id IS NOT NULL`,
  `CREATE INDEX IF NOT EXISTS idx_faturas_recebidas_email_uid ON faturas_recebidas(email_uid)   WHERE email_uid IS NOT NULL`,
  `CREATE TABLE IF NOT EXISTS custos_obra (
    id                   uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
    contrato_id          uuid          NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
    fatura_recebida_id   uuid          REFERENCES faturas_recebidas(id) ON DELETE SET NULL,
    tipo                 text          NOT NULL CHECK (tipo IN ('material', 'subempreitada', 'mao_de_obra', 'equipamento')),
    data                 date          NOT NULL,
    descricao            text,
    capitulo_ref         text,
    fornecedor_id        uuid          REFERENCES fornecedores(id) ON DELETE SET NULL,
    trabalhador_id       uuid          REFERENCES trabalhadores(id) ON DELETE SET NULL,
    quantidade           numeric(10,3),
    custo_unitario       numeric(10,2),
    valor                numeric(12,2) NOT NULL DEFAULT 0,
    fatura_ref           text,
    notas                text,
    criado_em            timestamptz   NOT NULL DEFAULT now(),
    atualizado_em        timestamptz   NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_custos_obra_contrato    ON custos_obra(contrato_id)`,
  `CREATE INDEX IF NOT EXISTS idx_custos_obra_tipo        ON custos_obra(tipo)`,
  `CREATE INDEX IF NOT EXISTS idx_custos_obra_data        ON custos_obra(data)`,
  `CREATE INDEX IF NOT EXISTS idx_custos_obra_fornecedor  ON custos_obra(fornecedor_id) WHERE fornecedor_id IS NOT NULL`,
  `CREATE INDEX IF NOT EXISTS idx_custos_obra_trabalhador ON custos_obra(trabalhador_id) WHERE trabalhador_id IS NOT NULL`,
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get('token') !== process.env.MIGRATION_TOKEN) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const results: string[] = [];
  const client = await pool.connect();
  try {
    for (const sql of MIGRATIONS) {
      await client.query(sql);
      results.push('OK: ' + sql.slice(0, 60).trim().replace(/\s+/g, ' '));
    }
    return NextResponse.json({ success: true, ran: results.length, results });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg, results }, { status: 500 });
  } finally {
    client.release();
  }
}
