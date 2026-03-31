import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { fornecedor, nif, data, valor_total, valor_sem_iva, iva, descricao, categoria, obra, notas } = body;

    await pool.query(`
      CREATE TABLE IF NOT EXISTS despesas_manuais (
        id SERIAL PRIMARY KEY,
        fornecedor TEXT,
        nif TEXT,
        data_documento DATE,
        valor_total NUMERIC,
        valor_sem_iva NUMERIC,
        taxa_iva NUMERIC,
        descricao TEXT,
        categoria TEXT,
        obra TEXT,
        notas TEXT,
        criado_em TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    const result = await pool.query(
      `INSERT INTO despesas_manuais
         (fornecedor, nif, data_documento, valor_total, valor_sem_iva, taxa_iva, descricao, categoria, obra, notas)
       VALUES ($1,$2,$3::date,$4,$5,$6,$7,$8,$9,$10)
       RETURNING id, criado_em::text`,
      [
        fornecedor || null,
        nif || null,
        data || null,
        valor_total || null,
        valor_sem_iva || null,
        iva || null,
        descricao || null,
        categoria || null,
        obra || null,
        notas || null,
      ]
    );

    return NextResponse.json({ ok: true, id: result.rows[0].id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[api/despesas/registar]', msg);
    return NextResponse.json({ error: 'Erro ao guardar despesa' }, { status: 500 });
  }
}
