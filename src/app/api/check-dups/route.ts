import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get('key') !== 'check2026') return NextResponse.json({error:'unauthorized'},{status:401});

  const { rows } = await pool.query(`
    SELECT
      UPPER(REGEXP_REPLACE(TRIM(COALESCE(fornecedor,'')), '[^A-Za-z0-9 ]', '', 'g')) AS chave,
      array_agg(DISTINCT fornecedor ORDER BY fornecedor) AS variantes,
      COUNT(DISTINCT fornecedor)::int AS num_variantes,
      COUNT(*)::int AS total_faturas,
      ROUND(COALESCE(SUM(valor_sem_iva),0)::numeric, 2)::float AS total_valor
    FROM despesas
    WHERE fornecedor IS NOT NULL AND fornecedor != ''
    GROUP BY chave
    HAVING COUNT(DISTINCT fornecedor) > 1
    ORDER BY total_valor DESC
  `);
  return NextResponse.json({ duplicates: rows, count: rows.length });
}
