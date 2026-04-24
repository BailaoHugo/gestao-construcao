import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const obraId = searchParams.get('obra_id');
  const from = searchParams.get('from') || '2026-01-01';
  const to = searchParams.get('to') || new Date().toISOString().slice(0, 10);

  if (!obraId) return NextResponse.json({ error: 'obra_id required' }, { status: 400 });

  const [fornRows, despRows] = await Promise.all([
    // Agrupar por nome normalizado (UPPER + remove pontuação) para unir "LIGHTHOUSE LDA" e "LIGHTHOUSE, LDA"
    pool.query(`
      SELECT
        UPPER(REGEXP_REPLACE(TRIM(COALESCE(fornecedor, '')), '[^A-Za-z0-9 ]', '', 'g')) AS fornecedor_key,
        -- Mostrar o nome mais frequente do grupo
        (SELECT fornecedor FROM despesas d2
         WHERE d2.centro_custo_id = $1
           AND d2.data_despesa BETWEEN $2 AND $3
           AND UPPER(REGEXP_REPLACE(TRIM(COALESCE(d2.fornecedor,'')), '[^A-Za-z0-9 ]', '', 'g'))
             = UPPER(REGEXP_REPLACE(TRIM(COALESCE(d.fornecedor,'')), '[^A-Za-z0-9 ]', '', 'g'))
         GROUP BY fornecedor ORDER BY COUNT(*) DESC LIMIT 1
        ) AS fornecedor,
        COALESCE(SUM(valor_sem_iva), 0)::float AS total_sem_iva,
        COUNT(*)::int                           AS num_faturas
      FROM despesas d
      WHERE centro_custo_id = $1
        AND data_despesa BETWEEN $2 AND $3
      GROUP BY fornecedor_key
      ORDER BY total_sem_iva DESC
    `, [obraId, from, to]),
    pool.query(`
      SELECT
        id, data_despesa, fornecedor, numero_fatura,
        COALESCE(valor_sem_iva, 0)::float   AS valor_sem_iva,
        COALESCE(valor_total_civa, 0)::float AS valor_total_civa,
        tipo, nome_ficheiro, documento_ref
      FROM despesas
      WHERE centro_custo_id = $1
        AND data_despesa BETWEEN $2 AND $3
      ORDER BY data_despesa DESC
    `, [obraId, from, to]),
  ]);

  return NextResponse.json({
    fornecedores: fornRows.rows,
    despesas: despRows.rows,
  });
}
