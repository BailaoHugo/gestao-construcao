import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from') || '2026-01-01';
  const to = searchParams.get('to') || new Date().toISOString().slice(0, 10);

  const { rows } = await pool.query(`
    SELECT
      o.id,
      o.code,
      o.nome,
      COALESCE(SUM(d.valor_sem_iva), 0)::float   AS total_sem_iva,
      COALESCE(SUM(d.valor_total_civa), 0)::float AS total_com_iva,
      COUNT(d.id)::int                             AS num_faturas,
      COUNT(DISTINCT d.fornecedor)::int            AS num_fornecedores
    FROM obras o
    LEFT JOIN despesas d
      ON d.centro_custo_id = o.id
      AND d.data_despesa BETWEEN $1 AND $2
    WHERE EXISTS (SELECT 1 FROM despesas d2 WHERE d2.centro_custo_id = o.id AND d2.data_despesa BETWEEN $1 AND $2)
    GROUP BY o.id, o.code, o.nome
    ORDER BY total_sem_iva DESC
  `, [from, to]);

  return NextResponse.json({ obras: rows });
}
