import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
async function ensureCustosTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS contrato_custos (
      id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
      contrato_id     uuid          NOT NULL,
      fornecedor      text          NOT NULL,
      nif_fornecedor  text,
      numero_fatura   text,
      data_fatura     date          NOT NULL,
      descricao       text          NOT NULL,
      valor           numeric(12,2) NOT NULL DEFAULT 0,
      data_vencimento date,
      tipo            text          NOT NULL DEFAULT 'subempreitada'
                                    CHECK (tipo IN ('subempreitada', 'material', 'equipamento', 'outro')),
      notas           text,
      criado_em       timestamptz   NOT NULL DEFAULT now()
    )
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_contrato_custos_contrato ON contrato_custos(contrato_id)
  `);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: contratoId } = await params;
  try {
    await ensureCustosTable();
    const { rows } = await pool.query(
      `SELECT id, contrato_id AS "contratoId", fornecedor, nif_fornecedor AS "nifFornecedor",
              numero_fatura AS "numeroFatura", data_fatura AS "dataFatura",
              descricao, valor, data_vencimento AS "dataVencimento", tipo, notas,
              criado_em AS "criadoEm"
       FROM contrato_custos
       WHERE contrato_id = $1
       ORDER BY data_fatura DESC, criado_em DESC`,
      [contratoId],
    );
    return NextResponse.json(rows);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: contratoId } = await params;
  try {
    await ensureCustosTable();
    const body = await req.json();
    const {
      fornecedor,
      nifFornecedor,
      numeroFatura,
      dataFatura,
      descricao,
      valor,
      dataVencimento,
      tipo,
      notas,
    } = body;

    if (!fornecedor || !dataFatura || !descricao || valor === undefined) {
      return NextResponse.json(
        { error: 'fornecedor, dataFatura, descricao e valor são obrigatórios' },
        { status: 400 },
      );
    }

    const { rows } = await pool.query(
      `INSERT INTO contrato_custos
         (contrato_id, fornecedor, nif_fornecedor, numero_fatura, data_fatura,
          descricao, valor, data_vencimento, tipo, notas)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING id, contrato_id AS "contratoId", fornecedor, nif_fornecedor AS "nifFornecedor",
                 numero_fatura AS "numeroFatura", data_fatura AS "dataFatura",
                 descricao, valor, data_vencimento AS "dataVencimento", tipo, notas,
                 criado_em AS "criadoEm"`,
      [
        contratoId,
        fornecedor,
        nifFornecedor ?? null,
        numeroFatura ?? null,
        dataFatura,
        descricao,
        valor,
        dataVencimento ?? null,
        tipo ?? 'subempreitada',
        notas ?? null,
      ],
    );
    return NextResponse.json(rows[0], { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
