import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const obra    = searchParams.get('obra') || '';
    const cat     = searchParams.get('categoria') || '';
    const inicio  = searchParams.get('inicio') || '';
    const fim     = searchParams.get('fim') || '';
    const page    = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit   = 50;
    const offset  = (page - 1) * limit;

    // Ensure table exists
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

    const conditions: string[] = [];
    const params: unknown[] = [];
    let i = 1;

    if (obra)   { conditions.push(`obra ILIKE $${i++}`);            params.push(`%${obra}%`); }
    if (cat)    { conditions.push(`categoria = $${i++}`);           params.push(cat); }
    if (inicio) { conditions.push(`data_documento >= $${i++}::date`); params.push(inicio); }
    if (fim)    { conditions.push(`data_documento <= $${i++}::date`); params.push(fim); }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    // Totals
    const totalsRes = await pool.query(
      `SELECT COUNT(*) AS total,
              COALESCE(SUM(valor_total), 0) AS soma_total,
              COALESCE(SUM(valor_sem_iva), 0) AS soma_sem_iva
       FROM despesas_manuais ${where}`,
      params
    );

    // Rows
    const rowsRes = await pool.query(
      `SELECT id, fornecedor, nif,
              TO_CHAR(data_documento, 'YYYY-MM-DD') AS data,
              valor_total, valor_sem_iva, taxa_iva,
              descricao, categoria, obra, notas,
              TO_CHAR(criado_em, 'YYYY-MM-DD HH24:MI') AS criado_em
       FROM despesas_manuais ${where}
       ORDER BY criado_em DESC
       LIMIT $${i} OFFSET $${i + 1}`,
      [...params, limit, offset]
    );

    const { total, soma_total, soma_sem_iva } = totalsRes.rows[0];

    return NextResponse.json({
      items: rowsRes.rows,
      total: parseInt(total),
      soma_total: parseFloat(soma_total),
      soma_sem_iva: parseFloat(soma_sem_iva),
      page,
      pages: Math.ceil(parseInt(total) / limit),
    });
  } catch (err) {
    console.error('[api/despesas/lista]', err);
    return NextResponse.json({ error: 'Erro ao carregar despesas' }, { status: 500 });
  }
}
